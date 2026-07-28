import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GoogleAuth } from "google-auth-library";
import { loadFirebaseAdminConfig } from "./firebase-admin-config.mjs";

const { projectId, serviceAccount } = await loadFirebaseAdminConfig();
const bucket =
  process.env.VITE_FIREBASE_STORAGE_BUCKET ||
  `${projectId}.firebasestorage.app`;
const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});
const client = await auth.getClient();
const releaseName = `projects/${projectId}/releases/firebase.storage/${bucket}`;
const release = await client.request({
  url: `https://firebaserules.googleapis.com/v1/${releaseName}`,
});
const rulesetName = release.data.rulesetName;
if (!rulesetName) throw new Error("The active Firebase Storage ruleset could not be identified.");

const ruleset = await client.request({
  url: `https://firebaserules.googleapis.com/v1/${rulesetName}`,
});
const files = ruleset.data.source?.files ?? [];
const outputPath = resolve("exports", "deployed-storage.rules");
await mkdir(resolve("exports"), { recursive: true });
await writeFile(outputPath, files.map((file) => file.content ?? "").join("\n"), "utf8");

console.log(JSON.stringify({
  projectId,
  bucket,
  rulesetName,
  releaseUpdateTime: release.data.updateTime,
  outputPath,
  files: files.map((file) => file.name),
}, null, 2));
