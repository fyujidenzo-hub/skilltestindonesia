import fs from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const backup = {};

const collections = await db.listCollections();

for (const collectionRef of collections) {
  const collectionName = collectionRef.id;
  console.log(`Exporting ${collectionName}...`);

  const snapshot = await collectionRef.get();

  backup[collectionName] = {};

  snapshot.forEach((doc) => {
    backup[collectionName][doc.id] = doc.data();
  });
}

fs.writeFileSync(
  "firestore-backup.json",
  JSON.stringify(backup, null, 2),
  "utf8"
);

console.log("Export complete: firestore-backup.json");