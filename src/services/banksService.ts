import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { BankPlacement } from "../types";

const COLLECTION = "banks";

export async function getBanks(): Promise<BankPlacement[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as BankPlacement));
}

export async function getBankById(id: string): Promise<BankPlacement | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as BankPlacement) : null;
}

export async function createBank(bank: Omit<BankPlacement, "id">): Promise<BankPlacement> {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = await addDoc(collection(db, COLLECTION), bank);
  return { id: docRef.id, ...bank };
}

export async function updateBank(id: string, data: Partial<BankPlacement>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteBank(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
