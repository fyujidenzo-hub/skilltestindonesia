import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";
import { loadFirebaseAdminConfig } from "./firebase-admin-config.mjs";

const { projectId, serviceAccount } = await loadFirebaseAdminConfig();
const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const client = await auth.getClient();
const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`;
const release = await client.request({ url: releaseUrl });
const rulesetName = release.data.rulesetName;
if (!rulesetName) throw new Error("The active Cloud Firestore ruleset could not be identified.");

const ruleset = await client.request({
  url: `https://firebaserules.googleapis.com/v1/${rulesetName}`,
});
const files = ruleset.data.source?.files ?? [];
const outputPath = resolve("exports", "deployed-firestore.rules");
await writeFile(
  outputPath,
  files.map((file) => file.content ?? "").join("\n"),
  "utf8",
);

console.log(JSON.stringify({
  projectId,
  rulesetName,
  releaseUpdateTime: release.data.updateTime,
  outputPath,
  files: files.map((file) => file.name),
}, null, 2));
