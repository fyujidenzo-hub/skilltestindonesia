import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { StaffAdmin } from "../types";

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
  const q = query(collection(db, COLLECTION), where("code", "==", code));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as StaffAdmin);
}

export async function createAdmin(admin: Omit<StaffAdmin, "id">): Promise<StaffAdmin> {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = await addDoc(collection(db, COLLECTION), admin);
  return { id: docRef.id, ...admin };
}

export async function updateAdmin(id: string, data: Partial<StaffAdmin>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteAdmin(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
