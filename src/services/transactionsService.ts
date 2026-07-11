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

export type CreateTransactionResult = {
  transaction: Transaction;
  updatedMember?: Member;
};

export type CreateTransactionInput = Omit<Transaction, "id"> & {
  id?: string;
  submittedWithdrawalPassword?: string;
};

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

async function getLiveMemberAndOrders(memberUsername: string) {
  if (!db) throw new Error("Firebase not initialized");

  const memberSnapshot = await getDocs(query(collection(db, "members"), where("username", "==", memberUsername)));
  const memberDoc = memberSnapshot.docs[0];
  if (!memberDoc) throw new Error("Member no longer exists.");

  const ordersSnapshot = await getDocs(query(collection(db, "orders"), where("member", "==", memberUsername)));
  const liveOrders = ordersSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Order));

  return {
    memberRef: doc(db, "members", memberDoc.id),
    member: { id: memberDoc.id, ...memberDoc.data() } as Member,
    orders: liveOrders,
  };
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
  const { submittedWithdrawalPassword: _submittedWithdrawalPassword, ...transactionData } = transaction;
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

export async function getTransactionsByMember(memberUsername: string): Promise<Transaction[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("member", "==", memberUsername));
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

  const { memberRef, member, orders } = await getLiveMemberAndOrders(transaction.member);
  const txRef = doc(db, COLLECTION, id);
  let updatedMember: Member = member;

  await runTransaction(db, async (firestoreTransaction) => {
    const [memberSnap, txSnap] = await Promise.all([firestoreTransaction.get(memberRef), firestoreTransaction.get(txRef)]);

    if (txSnap.exists()) throw new Error("This request already exists.");
    if (!memberSnap.exists()) throw new Error("Member no longer exists.");

    const liveMember = { id: memberSnap.id, ...memberSnap.data() } as Member;
    const currentBalance = Number(liveMember.balance ?? 0);
    const amount = Number(nextTransaction.amount ?? 0);
    const validationMessage = validateWithdrawalRequest({ ...liveMember, balance: currentBalance }, orders, amount);
    if (validationMessage) throw new Error(validationMessage);

    const savedWithdrawalPassword = String(liveMember.withdrawalPassword ?? "").trim();
    const submittedWithdrawalPassword = String(transaction.submittedWithdrawalPassword ?? "").trim();
    if (!savedWithdrawalPassword) {
      throw new Error("Withdrawal password is not set. Please contact Super Admin to reset it.");
    }
    if (!submittedWithdrawalPassword) {
      throw new Error("Withdrawal password is required.");
    }
    if (submittedWithdrawalPassword !== savedWithdrawalPassword) {
      throw new Error("Incorrect withdrawal password.");
    }

    const balanceDeductedAt = nowStamp();
    const nextBalance = currentBalance - amount;
    const withdrawalTransaction: Transaction = {
      ...nextTransaction,
      balanceDeductedAt,
      creditedAt: "",
    };

    firestoreTransaction.set(txRef, withdrawalTransaction);
    firestoreTransaction.update(memberRef, { balance: nextBalance });
    updatedMember = { ...liveMember, balance: nextBalance };
    Object.assign(nextTransaction, withdrawalTransaction);
  });

  return { transaction: nextTransaction, updatedMember };
}

export async function createRewardTransaction({
  member,
  admin = "Super Admin",
  amount,
  createdAt = nowStamp(),
}: {
  member: string;
  admin?: string;
  amount: number;
  createdAt?: string;
}): Promise<Transaction> {
  if (!db) throw new Error("Firebase not initialized");

  const safeAmount = Math.max(0, Number(amount) || 0);
  if (safeAmount <= 0) throw new Error("Reward amount must be greater than zero.");

  const id = crypto.randomUUID();
  const rewardTransaction: Transaction = {
    id,
    requestId: `RW-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
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

  await setDoc(doc(db, COLLECTION, id), rewardTransaction);
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
          transaction.update(memberRef, { balance: nextBalance });
        }
      } else {
        if (liveTransaction.creditedAt) throw new Error("This request has already been credited.");
        nextBalance = currentBalance + amount;
        transaction.update(memberRef, { balance: nextBalance });
      }

      transaction.update(txRef, { status, creditedAt: nowStamp() });
      return;
    }

    if (liveTransaction.type === "withdrawal" && wasWithdrawalDeductedOnSubmit) {
      nextBalance = currentBalance + amount;
      transaction.update(memberRef, { balance: nextBalance });
    }

    transaction.update(txRef, { status });
  });

  return { ...member, balance: nextBalance };
}
