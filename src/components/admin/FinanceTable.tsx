import { CheckCircle2, Eye, KeyRound, LockKeyhole, XCircle } from "lucide-react";
import { useState } from "react";
import { Panel } from "../common";
import { statusStyles } from "../../constants";
import { approveTransactionRequest } from "../../services/transactionsService";
import { useAppStore } from "../../store/AppStore";
import type { Member, Transaction } from "../../types";
import { formatRupiah, shortDate } from "../../utils";
import SecurityItem from "./SecurityItem";

export default function FinanceTable({
  transactions,
  members,
  canApprove,
}: {
  transactions: Transaction[];
  members: Member[];
  canApprove: boolean;
}) {
  const { dispatch } = useAppStore();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const topUps = transactions.filter((transaction) => transaction.type === "topup");
  const withdrawals = transactions.filter((transaction) => transaction.type === "withdrawal");

  const updateStatus = async (transactionItem: Transaction, status: "approved" | "rejected") => {
    if (!canApprove) return;
    const member = members.find((item) => item.username === transactionItem.member);
    if (!member) {
      console.error("Unable to find member for transaction:", transactionItem);
      return;
    }

    setUpdatingId(transactionItem.id);
    try {
      const updatedMember = await approveTransactionRequest(transactionItem, member, status);
      dispatch({ type: "updateTransaction", payload: { id: transactionItem.id, status } });
      dispatch({ type: "updateMember", payload: updatedMember });
    } catch (error) {
      console.error("Failed to update transaction status:", error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Panel title="Finance">
        <div className="grid gap-5 lg:grid-cols-2">
          <ApprovalColumn
            title="Top-up requests"
            emptyText="No top-up requests in this admin scope."
            transactions={topUps}
            updatingId={updatingId}
            canApprove={canApprove}
            onUpdateStatus={updateStatus}
          />
          <ApprovalColumn
            title="Withdrawal requests"
            emptyText="No withdrawal requests in this admin scope."
            transactions={withdrawals}
            updatingId={updatingId}
            canApprove={canApprove}
            onUpdateStatus={updateStatus}
          />
        </div>
      </Panel>
      <Panel title="Security Controls">
        <div className="space-y-3">
          <SecurityItem icon={<KeyRound />} title="Change account password" text="Use the Account tab to update admin credentials." />
          <SecurityItem icon={<LockKeyhole />} title="Change withdrawal password" text="Separate PIN for withdrawal approval requests." />
          <SecurityItem icon={<Eye />} title="Audit activity" text="Transactions and order changes persist automatically." />
        </div>
      </Panel>
    </div>
  );
}

function ApprovalColumn({
  title,
  emptyText,
  transactions,
  updatingId,
  canApprove,
  onUpdateStatus,
}: {
  title: string;
  emptyText: string;
  transactions: Transaction[];
  updatingId: string | null;
  canApprove: boolean;
  onUpdateStatus: (transaction: Transaction, status: "approved" | "rejected") => void;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-black uppercase text-slate-500">{title}</h3>
      <div className="space-y-3">
        {transactions.length ? (
          transactions.map((transaction) => (
            <div key={transaction.id} className="rounded border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold">{transaction.member}</p>
                  <p className="text-sm text-slate-500">{transaction.admin} · {shortDate(transaction.createdAt)}</p>
                  {transaction.requestId && <p className="text-xs font-bold text-forest">{transaction.requestId}</p>}
                  {transaction.senderName && <p className="text-xs text-slate-500">Sender: {transaction.senderName}</p>}
                  {transaction.proofName && <p className="text-xs text-slate-500">Proof: {transaction.proofName}</p>}
                </div>
                <div className="text-left sm:text-right">
                  <p className={`text-sm font-bold capitalize ${transaction.type === "topup" ? "text-emerald-700" : "text-coral"}`}>{transaction.type}</p>
                  <p className="text-lg font-black">{formatRupiah(transaction.amount)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className={`rounded px-2 py-1 text-xs font-bold capitalize ${statusStyles[transaction.status]}`}>{transaction.status}</span>
                {transaction.status === "pending" && canApprove && (
                  <div className="flex gap-2">
                    <button disabled={updatingId === transaction.id} className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300" onClick={() => onUpdateStatus(transaction, "approved")}>
                      <CheckCircle2 size={15} /> Approve
                    </button>
                    <button disabled={updatingId === transaction.id} className="inline-flex items-center gap-1 rounded bg-rose-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300" onClick={() => onUpdateStatus(transaction, "rejected")}>
                      <XCircle size={15} /> Cancel
                    </button>
                  </div>
                )}
                {transaction.status === "pending" && !canApprove && <span className="text-xs font-bold text-slate-400">Super Admin approval required</span>}
              </div>
            </div>
          ))
        ) : (
          <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">{emptyText}</p>
        )}
      </div>
    </section>
  );
}
