import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from "firebase/firestore";
import { auth, db, waitForAuthReady } from "../firebase";
import type { Member, Order, Transaction } from "../types";
import { belongsToMember } from "./memberOwnership";

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

export type CreateTransactionResult = {
  transaction: Transaction;
  updatedMember?: Member;
};

export type CreateTransactionInput = Omit<Transaction, "id" | "memberId"> & {
  id?: string;
  memberId: string;
  submittedWithdrawalPassword?: string;
};

export function hasActiveTasksForUser(member: Pick<Member, "id" | "username">, orders: Order[]) {
  return orders.some((order) => belongsToMember(order, member) && ACTIVE_ORDER_STATUSES.has(String(order.status).toLowerCase()));
}

export function validateWithdrawalRequest(
  member: Pick<Member, "id" | "username" | "balance" | "withdrawalLocked" | "withdrawalRemarks">,
  orders: Order[],
  amount: number,
) {
  // SAFETY: keep this validation in submit/service logic, not only disabled UI buttons.
  if (member.withdrawalLocked) {
    return member.withdrawalRemarks?.trim() || "Withdrawals are temporarily locked for this account. Please contact Customer Service.";
  }
  if (hasActiveTasksForUser(member, orders)) {
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

function nowStamp() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

function requestPrefix(type: Transaction["type"]) {
  if (type === "topup") return "TU";
  if (type === "withdrawal") return "WD";
  return "RW";
}

function buildTransaction(transaction: CreateTransactionInput, forcedId?: string, forcedRequestId?: string): Transaction {
  const {
    submittedWithdrawalPassword: _submittedWithdrawalPassword,
    ...transactionData
  } = transaction;
  const id = forcedId || transactionData.id || crypto.randomUUID();
  const requestId =
    forcedRequestId ||
    transactionData.requestId ||
    `${requestPrefix(transactionData.type)}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return {
    ...transactionData,
    id,
    requestId,
    status: "pending",
    creditedAt: transactionData.creditedAt ?? "",
    balanceDeductedAt: transactionData.balanceDeductedAt ?? "",
    senderName: transactionData.senderName ?? "",
    withdrawalBankName: transactionData.withdrawalBankName ?? "",
    withdrawalAccountName: transactionData.withdrawalAccountName ?? "",
    withdrawalAccountNumber: transactionData.withdrawalAccountNumber ?? "",
    proofName: transactionData.proofName ?? "",
    proofType: transactionData.proofType ?? "",
    proofDataUrl: transactionData.proofDataUrl ?? "",
    proofUrl: transactionData.proofUrl ?? "",
    proofPath: transactionData.proofPath ?? "",
    proofSize: transactionData.proofSize ?? 0,
  };
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

export async function getTransactionsByMember(memberId: string, memberUsername: string): Promise<Transaction[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("memberId", "==", memberId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Transaction));
}

export async function createTransaction(transaction: CreateTransactionInput): Promise<CreateTransactionResult> {
  if (!db) throw new Error("Firebase not initialized");

  const id = transaction.id || crypto.randomUUID();
  const requestId =
    transaction.requestId ||
    `${requestPrefix(transaction.type)}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const nextTransaction = buildTransaction(transaction, id, requestId);

  if (transaction.type !== "withdrawal") {
    await setDoc(doc(db, COLLECTION, id), nextTransaction);
    return { transaction: nextTransaction };
  }

  const user = auth?.currentUser ?? await waitForAuthReady();
  if (!user) throw new Error("Sesi anggota tidak aktif.");
  const response = await fetch("/api/member/withdrawals", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({
      amount: nextTransaction.amount,
      withdrawalPin: transaction.submittedWithdrawalPassword,
      withdrawalBankName: nextTransaction.withdrawalBankName,
      withdrawalAccountName: nextTransaction.withdrawalAccountName,
      withdrawalAccountNumber: nextTransaction.withdrawalAccountNumber,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Permintaan penarikan tidak dapat diproses.");
  return result as CreateTransactionResult;
}

export async function createRewardTransaction({
  memberId,
  member,
  admin = "Super Admin",
  amount,
  createdAt = nowStamp(),
}: {
  memberId: string;
  member: string;
  admin?: string;
  amount: number;
  createdAt?: string;
}): Promise<Transaction> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;

  const safeAmount = Math.max(0, Number(amount) || 0);
  if (safeAmount <= 0) throw new Error("Reward amount must be greater than zero.");

  const id = crypto.randomUUID();
  const rewardTransaction: Transaction = {
    id,
    requestId: `RW-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    memberId,
    member,
    admin,
    type: "reward",
    amount: safeAmount,
    status: "approved",
    createdAt,
    creditedAt: createdAt,
    balanceDeductedAt: "",
    senderName: "Super Admin",
    withdrawalBankName: "",
    withdrawalAccountName: "",
    withdrawalAccountNumber: "",
    proofName: "",
    proofType: "",
    proofDataUrl: "",
    proofUrl: "",
    proofPath: "",
    proofSize: 0,
  };

  await runTransaction(firestore, async (firestoreTransaction) => {
    const memberRef = doc(firestore, "members", memberId);
    const transactionRef = doc(firestore, COLLECTION, id);
    const [memberSnapshot, transactionSnapshot] = await Promise.all([
      firestoreTransaction.get(memberRef),
      firestoreTransaction.get(transactionRef),
    ]);
    if (!memberSnapshot.exists()) throw new Error("Member no longer exists.");
    if (transactionSnapshot.exists()) throw new Error("This reward already exists.");
    const currentBalance = Number(memberSnapshot.data().balance ?? 0);
    firestoreTransaction.set(transactionRef, rewardTransaction);
    firestoreTransaction.update(memberRef, {
      balance: currentBalance + safeAmount,
      lastBalanceTransactionId: id,
    });
  });
  return rewardTransaction;
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
    const amount = Number(liveTransaction.amount ?? 0);
    const wasWithdrawalDeductedOnSubmit = liveTransaction.type === "withdrawal" && Boolean(liveTransaction.balanceDeductedAt);
    nextBalance = currentBalance;

    if (status === "approved") {
      if (liveTransaction.type === "withdrawal") {
        if (amount < MIN_WITHDRAWAL_AMOUNT) throw new Error("Minimum Withdrawal Amount is Rp100,000.");

        // New flow: pending withdrawal was already deducted when the request was created.
        // Backward compatibility: old pending withdrawal requests without balanceDeductedAt still deduct on approval.
        if (!wasWithdrawalDeductedOnSubmit) {
          if (amount > currentBalance) throw new Error("Insufficient balance.");
          nextBalance = Math.max(0, currentBalance - amount);
          transaction.update(memberRef, { balance: nextBalance, lastBalanceTransactionId: liveTransaction.id });
        }
      } else {
        if (liveTransaction.creditedAt) throw new Error("This request has already been credited.");
        nextBalance = currentBalance + amount;
        transaction.update(memberRef, { balance: nextBalance, lastBalanceTransactionId: liveTransaction.id });
      }

      transaction.update(txRef, { status, creditedAt: nowStamp() });
      return;
    }

    if (liveTransaction.type === "withdrawal" && wasWithdrawalDeductedOnSubmit) {
      nextBalance = currentBalance + amount;
      transaction.update(memberRef, { balance: nextBalance, lastBalanceTransactionId: liveTransaction.id });
    }

    transaction.update(txRef, { status });
  });

  return { ...member, balance: nextBalance };
}
