import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { loadFirebaseAdminConfig } from "./firebase-admin-config.mjs";

const { projectId, serviceAccount } = await loadFirebaseAdminConfig();

const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount), projectId });
const db = getFirestore(app);
const auth = getAuth(app);
const backup = {
  exportedAt: new Date().toISOString(),
  projectId,
  collections: {},
  authUsers: [],
};

const collections = await db.listCollections();
for (const collectionReference of collections) {
  const snapshot = await collectionReference.get();
  backup.collections[collectionReference.id] = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
}

let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  backup.authUsers.push(
    ...page.users.map((user) => ({
      uid: user.uid,
      email: user.email || "",
      disabled: user.disabled,
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
    })),
  );
  pageToken = page.pageToken;
} while (pageToken);

const directory = resolve("exports");
await mkdir(directory, { recursive: true });
const stamp = backup.exportedAt.replace(/[:.]/g, "-");
const outputPath = resolve(directory, `production-backup-${projectId}-${stamp}.json`);
await writeFile(outputPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  outputPath,
  projectId,
  counts: Object.fromEntries(
    Object.entries(backup.collections).map(([name, items]) => [name, items.length]),
  ),
  authUsers: backup.authUsers.length,
}, null, 2));
