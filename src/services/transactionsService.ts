import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import type { Member, Order, Transaction } from "../types";

const COLLECTION = "transactions";
export const MIN_WITHDRAWAL_AMOUNT = 100000;

const ACTIVE_ORDER_STATUSES = new Set([
  "pending",
  "pending_confirmation",
  "waiting",
  "waiting_assignment",
  "waiting_shipment",
  "processing",
  "in_progress",
  "assigned",
  "claimed",
  "incomplete",
  "product_assigned",
  "belum_diserahkan",
  "frozen",
]);

export function hasActiveTasksForUser(memberUsername: string, orders: Order[]) {
  return orders.some((order) => order.member === memberUsername && ACTIVE_ORDER_STATUSES.has(String(order.status).toLowerCase()));
}

export function validateWithdrawalRequest(member: Pick<Member, "username" | "balance">, orders: Order[], amount: number) {
  // SAFETY: keep this validation in submit/service logic, not only disabled UI buttons.
  if (hasActiveTasksForUser(member.username, orders)) {
    return "You cannot withdraw while you still have active or incomplete tasks.";
  }
  if (member.balance < MIN_WITHDRAWAL_AMOUNT || amount < MIN_WITHDRAWAL_AMOUNT) {
    return "Minimum Withdrawal Amount is Rp100,000.";
  }
  if (amount > member.balance) {
    return "Insufficient balance.";
  }
  return "";
}

async function validateFirebaseWithdrawalBeforeCreate(memberUsername: string, amount: number) {
  if (!db) return;
  const memberSnapshot = await getDocs(query(collection(db, "members"), where("username", "==", memberUsername)));
  const memberDoc = memberSnapshot.docs[0];
  if (!memberDoc) throw new Error("Member no longer exists.");

  const liveMember = { id: memberDoc.id, ...memberDoc.data() } as Member;
  const ordersSnapshot = await getDocs(query(collection(db, "orders"), where("member", "==", memberUsername)));
  const liveOrders = ordersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Order));
  const validationMessage = validateWithdrawalRequest(liveMember, liveOrders, amount);
  if (validationMessage) throw new Error(validationMessage);
}

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

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
  if (transaction.type === "withdrawal") {
    await validateFirebaseWithdrawalBeforeCreate(transaction.member, Number(transaction.amount ?? 0));
  }
  const id = transaction.id || crypto.randomUUID();
  const requestId =
    transaction.requestId ||
    `${transaction.type === "topup" ? "TU" : "WD"}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const nextTransaction: Transaction = {
    ...transaction,
    id,
    requestId,
    status: "pending",
    creditedAt: transaction.creditedAt ?? "",
    senderName: transaction.senderName ?? "",
    withdrawalBankName: transaction.withdrawalBankName ?? "",
    withdrawalAccountName: transaction.withdrawalAccountName ?? "",
    withdrawalAccountNumber: transaction.withdrawalAccountNumber ?? "",
    proofName: transaction.proofName ?? "",
    proofType: transaction.proofType ?? "",
    proofDataUrl: transaction.proofDataUrl ?? "",
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
  let nextBalance = member.balance;

  await runTransaction(firestore, async (transaction) => {
    const txRef = doc(firestore, COLLECTION, transactionItem.id);
    const memberRef = doc(firestore, "members", member.id);
    const [txSnap, memberSnap] = await Promise.all([transaction.get(txRef), transaction.get(memberRef)]);

    if (!txSnap.exists()) throw new Error("Request no longer exists.");
    if (txSnap.data().status !== "pending") throw new Error("This request has already been reviewed.");
    if (!memberSnap.exists()) throw new Error("Member no longer exists.");

    const liveTransaction = { id: txSnap.id, ...txSnap.data() } as Transaction;
    const currentBalance = Number(memberSnap.data().balance ?? member.balance);
    nextBalance = currentBalance;

    // SAFETY: rejected requests never change balance. Approved requests affect balance only once.
    if (status === "approved") {
      if (liveTransaction.creditedAt) throw new Error("This request has already been credited.");

      if (liveTransaction.type === "withdrawal") {
        if (liveTransaction.amount < MIN_WITHDRAWAL_AMOUNT) throw new Error("Minimum Withdrawal Amount is Rp100,000.");
        if (liveTransaction.amount > currentBalance) throw new Error("Insufficient balance.");
      }

      const signedAmount = liveTransaction.type === "topup" ? liveTransaction.amount : -liveTransaction.amount;
      nextBalance = Math.max(0, currentBalance + signedAmount);
      transaction.update(txRef, { status, creditedAt: nowStamp() });
      transaction.update(memberRef, { balance: nextBalance });
      return;
    }

    transaction.update(txRef, { status, creditedAt: liveTransaction.creditedAt ?? "" });
  });

  return { ...member, balance: nextBalance };
}
