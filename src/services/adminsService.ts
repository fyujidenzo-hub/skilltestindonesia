import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import type { StaffAdmin } from "../types";
import { identityKey } from "./identityKey";
import { normalizeUsername } from "./memberOwnership";

const COLLECTION = "admins";

export async function getAdmins(): Promise<StaffAdmin[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as StaffAdmin));
}

export async function getAdminById(id: string): Promise<StaffAdmin | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as StaffAdmin) : null;
}

export async function getAdminByCode(code: string): Promise<StaffAdmin | null> {
  if (!db) return null;
  const adminsRef = collection(db, COLLECTION);
  const codeSnapshot = await getDocs(query(adminsRef, where("code", "==", code)));
  if (!codeSnapshot.empty) return { id: codeSnapshot.docs[0].id, ...codeSnapshot.docs[0].data() } as StaffAdmin;

  const invitationSnapshot = await getDocs(query(adminsRef, where("invitationCode", "==", code)));
  return invitationSnapshot.empty ? null : ({ id: invitationSnapshot.docs[0].id, ...invitationSnapshot.docs[0].data() } as StaffAdmin);
}

export async function createAdmin(admin: Omit<StaffAdmin, "id"> & { id?: string }): Promise<StaffAdmin> {
  if (!db) throw new Error("Firebase not initialized");
  const id = admin.id || crypto.randomUUID();
  await setDoc(doc(db, COLLECTION, id), { ...admin, id });
  return { ...admin, id } as StaffAdmin;
}

export async function updateAdmin(id: string, data: Partial<StaffAdmin>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteAdmin(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateAdminProfile(admin: StaffAdmin, name: string, username: string): Promise<StaffAdmin> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const usernameNormalized = normalizeUsername(username);
  const oldUsernameNormalized = admin.usernameNormalized || normalizeUsername(admin.username ?? "");
  const [newLoginId, oldLoginId] = await Promise.all([
    identityKey("adminUsername", usernameNormalized),
    identityKey("adminUsername", oldUsernameNormalized),
  ]);
  const nextAdmin = { ...admin, name, username, usernameNormalized };

  await runTransaction(firestore, async (transaction) => {
    const adminRef = doc(firestore, COLLECTION, admin.id);
    const newLoginRef = doc(firestore, "loginIdentifiers", newLoginId);
    const oldLoginRef = doc(firestore, "loginIdentifiers", oldLoginId);
    const [newLoginSnapshot, oldLoginSnapshot] = await Promise.all([
      transaction.get(newLoginRef),
      transaction.get(oldLoginRef),
    ]);
    if (usernameNormalized !== oldUsernameNormalized && newLoginSnapshot.exists()) {
      throw new Error("Username admin sudah digunakan.");
    }
    transaction.update(adminRef, { name, username, usernameNormalized });
    if (usernameNormalized !== oldUsernameNormalized) {
      transaction.set(newLoginRef, {
        scope: "admin",
        subjectId: admin.id,
        authEmail: admin.authEmail ?? "",
        authUid: admin.authUid ?? "",
        conflict: false,
        updatedAt: new Date().toISOString(),
      });
      if (oldLoginSnapshot.data()?.subjectId === admin.id) transaction.delete(oldLoginRef);
    }
  });

  return nextAdmin;
}
