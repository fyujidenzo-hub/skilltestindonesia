import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";
import { loadFirebaseAdminConfig } from "./firebase-admin-config.mjs";

const rulesFileIndex = process.argv.indexOf("--rules-file");
const rulesFile = rulesFileIndex >= 0 ? process.argv[rulesFileIndex + 1] : "";
const validateOnly = process.argv.includes("--validate-only");
if (!rulesFile) throw new Error("--rules-file <file> is required.");

const { projectId, serviceAccount } = await loadFirebaseAdminConfig();
const content = await readFile(resolve(rulesFile), "utf8");
const files = [{ name: "firestore.rules", content }];
const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const client = await auth.getClient();
const baseUrl = "https://firebaserules.googleapis.com/v1";

const validation = await client.request({
  method: "POST",
  url: `${baseUrl}/projects/${projectId}:test`,
  data: { source: { files } },
});
const issues = validation.data.issues ?? [];
const errors = issues.filter((issue) => issue.severity === "ERROR");
if (errors.length) {
  throw new Error(`Rules validation failed: ${JSON.stringify(errors)}`);
}

if (validateOnly) {
  console.log(JSON.stringify({
    projectId,
    rulesFile: resolve(rulesFile),
    valid: true,
    warnings: issues.filter((issue) => issue.severity !== "ERROR").length,
  }, null, 2));
  process.exit(0);
}

const ruleset = await client.request({
  method: "POST",
  url: `${baseUrl}/projects/${projectId}/rulesets`,
  data: { source: { files } },
});
const rulesetName = ruleset.data.name;
if (!rulesetName) throw new Error("Firebase did not return the created ruleset name.");

const releaseName = `projects/${projectId}/releases/cloud.firestore`;
await client.request({
  method: "PATCH",
  url: `${baseUrl}/${releaseName}`,
  data: { release: { name: releaseName, rulesetName } },
});

console.log(JSON.stringify({
  projectId,
  rulesFile: resolve(rulesFile),
  rulesetName,
  warnings: issues.filter((issue) => issue.severity !== "ERROR").length,
}, null, 2));
