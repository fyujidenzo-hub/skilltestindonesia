import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function loadFirebaseAdminConfig() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const fileArgumentIndex = process.argv.indexOf("--service-account");
  const serviceAccountFile =
    (fileArgumentIndex >= 0 ? process.argv[fileArgumentIndex + 1] : "") ||
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE;

  let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson && serviceAccountFile) {
    serviceAccountJson = await readFile(resolve(serviceAccountFile), "utf8");
  }

  if (!projectId || !serviceAccountJson) {
    throw new Error(
      "VITE_FIREBASE_PROJECT_ID and either FIREBASE_SERVICE_ACCOUNT_JSON or --service-account <file> are required.",
    );
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  if (serviceAccount.project_id !== projectId) {
    throw new Error(
      `Service account project mismatch: expected ${projectId}, received ${serviceAccount.project_id}.`,
    );
  }

  return { projectId, serviceAccount };
}
