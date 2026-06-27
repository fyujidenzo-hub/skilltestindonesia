import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import type { Member, Transaction } from "../types";

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

export async function createTransaction(transaction: Omit<Transaction, "id"> & { id?: string }): Promise<Transaction> {
  if (!db) throw new Error("Firebase not initialized");
  const id = transaction.id || crypto.randomUUID();
  const requestId =
    transaction.requestId ||
    `${transaction.type === "topup" ? "TU" : "WD"}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const nextTransaction: Transaction = {
    ...transaction,
    id,
    requestId,
    senderName: transaction.senderName ?? "",
    proofName: transaction.proofName ?? "",
    proofType: transaction.proofType ?? "",
  };
  await setDoc(doc(db, COLLECTION, id), nextTransaction);
  return nextTransaction;
}

export async function updateTransaction(id: string, data: Partial<Transaction>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function approveTransactionRequest(transactionItem: Transaction, member: Member, status: "approved" | "rejected"): Promise<Member> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const signedAmount = transactionItem.type === "topup" ? transactionItem.amount : -transactionItem.amount;
  const nextBalance = status === "approved" ? Math.max(0, member.balance + signedAmount) : member.balance;
  const nextMember = { ...member, balance: nextBalance };

  await runTransaction(firestore, async (transaction) => {
    const txRef = doc(firestore, COLLECTION, transactionItem.id);
    const memberRef = doc(firestore, "members", member.id);
    const txSnap = await transaction.get(txRef);

    if (!txSnap.exists()) throw new Error("Request no longer exists.");
    if (txSnap.data().status !== "pending") throw new Error("This request has already been reviewed.");

    transaction.update(txRef, { status });
    if (status === "approved") transaction.update(memberRef, { balance: nextBalance });
  });

  return nextMember;
}
