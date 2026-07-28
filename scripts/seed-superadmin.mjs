import "dotenv/config";
import { createHash } from "node:crypto";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const expectedProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
const serviceAccount = serviceAccountJson ? JSON.parse(serviceAccountJson) : null;
if (serviceAccount?.project_id && expectedProjectId && serviceAccount.project_id !== expectedProjectId) {
  throw new Error(`Firebase Admin project mismatch: expected ${expectedProjectId}, received ${serviceAccount.project_id}.`);
}
const credential = serviceAccount ? cert(serviceAccount) : applicationDefault();
const app = getApps()[0] ?? initializeApp({ credential, projectId: expectedProjectId });
const auth = getAuth(app);
const db = getFirestore(app);

const id = process.env.SUPERADMIN_ID || "a0";
const username = String(process.env.SUPERADMIN_USERNAME || "superadmin").trim();
const usernameNormalized = username.toLowerCase();
const password = String(process.env.SUPERADMIN_PASSWORD || "");
const invitationCode = String(process.env.SUPERADMIN_INVITATION_CODE || "000001");
const authEmail = `admin-${id}@accounts.skilltestindonesia.com`;

if (password.length < 6) {
  throw new Error("Set SUPERADMIN_PASSWORD to at least 6 characters.");
}

let user;
try {
  user = await auth.getUserByEmail(authEmail);
  await auth.updateUser(user.uid, { password, displayName: "Super Admin" });
} catch (error) {
  if (error.code !== "auth/user-not-found") throw error;
  user = await auth.createUser({ email: authEmail, password, displayName: "Super Admin" });
}

const now = new Date().toISOString();
const loginId = createHash("sha256").update(`adminUsername:${usernameNormalized}`).digest("hex");
const admin = {
  id,
  authUid: user.uid,
  authEmail,
  name: "Super Admin",
  code: invitationCode,
  adminCode: invitationCode,
  invitationCode,
  registrationBonus: 0,
  registrations: 0,
  todayDeposits: 0,
  monthDeposits: 0,
  todayWithdrawals: 0,
  monthWithdrawals: 0,
  username,
  usernameNormalized,
  role: "super_admin",
};

const batch = db.batch();
batch.set(db.collection("admins").doc(id), admin, { merge: true });
batch.set(db.collection("authRoles").doc(user.uid), { role: "super_admin", subjectId: id, updatedAt: now });
batch.set(db.collection("loginIdentifiers").doc(loginId), {
  scope: "admin",
  subjectId: id,
  authUid: user.uid,
  authEmail,
  conflict: false,
  updatedAt: now,
});
batch.set(db.collection("invitationCodes").doc(invitationCode), {
  adminId: id,
  adminName: "Super Admin",
  registrationBonus: 0,
  active: true,
  updatedAt: now,
});
await batch.commit();
console.log(`Super Admin ${id} is ready in Firebase Authentication and Firestore.`);
