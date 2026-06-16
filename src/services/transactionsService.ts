import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Transaction } from "../types";

const COLLECTION = "transactions";

export async function getTransactions(): Promise<Transaction[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Transaction) : null;
}

export async function getTransactionsByMember(memberUsername: string): Promise<Transaction[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("member", "==", memberUsername));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function createTransaction(transaction: Omit<Transaction, "id">): Promise<Transaction> {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = await addDoc(collection(db, COLLECTION), transaction);
  return { id: docRef.id, ...transaction };
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
