import { CheckCircle2, Download, Eye, ReceiptText, X, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel } from "../common";
import { formatRupiah, shortDate } from "../../utils";
import { useAppStore } from "../../store/AppStore";
import { approveTransactionRequest } from "../../services/transactionsService";
import type { Member, Transaction } from "../../types";
import AmountSortControls, { type AmountSort } from "./AmountSortControls";

export default function TransactionManagementTable({
  transactions,
  members,
  canApprove,
}: {
  transactions: Transaction[];
  members: Member[];
  canApprove: boolean;
}) {
  const { dispatch } = useAppStore();
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null);
  const [message, setMessage] = useState("");
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [topUpSort, setTopUpSort] = useState<AmountSort>("none");
  const [withdrawalSort, setWithdrawalSort] = useState<AmountSort>("none");

  const topUps = useMemo(() => sortTransactions(transactions.filter((transaction) => transaction.type === "topup"), topUpSort), [topUpSort, transactions]);
  const withdrawals = useMemo(() => sortTransactions(transactions.filter((transaction) => transaction.type === "withdrawal"), withdrawalSort), [transactions, withdrawalSort]);

  const handleStatusChange = async (transactionItem: Transaction, status: "approved" | "rejected") => {
    if (!canApprove) return;
    if (transactionItem.status !== "pending") {
      setMessage("This request has already been reviewed.");
      return;
    }

    const member = members.find((item) => item.username === transactionItem.member);
    if (!member) {
      setMessage("Unable to find the customer for this request.");
      return;
    }

    setIsProcessingId(transactionItem.id);
    setMessage("");
    try {
      const updatedMember = await approveTransactionRequest(transactionItem, member, status);
      dispatch({ type: "updateTransaction", payload: { id: transactionItem.id, status } });
      dispatch({ type: "updateMember", payload: updatedMember });
      setMessage(`${transactionItem.type === "topup" ? "Top Up" : "Withdrawal"} request ${status}.`);
    } catch (error) {
      console.error("Failed to update transaction:", error);
      setMessage(error instanceof Error ? error.message : "Unable to update request. Check Firestore rules.");
    } finally {
      setIsProcessingId(null);
    }
  };

  return (
    <Panel title="Finance Request Management">
      {message && (
        <p className={`mb-4 rounded px-3 py-2 text-sm font-semibold ${message.includes("Unable") || message.includes("already") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      )}

      <div className="grid gap-6">
        <RequestTable
          title="Top Up History (Deposit)"
          tone="topup"
          emptyText="No top-up requests found."
          transactions={topUps}
          members={members}
          canApprove={canApprove}
          isProcessingId={isProcessingId}
          amountSort={topUpSort}
          onAmountSortChange={setTopUpSort}
          onViewDetails={setDetailTransaction}
          onApprove={(transaction) => handleStatusChange(transaction, "approved")}
          onReject={(transaction) => handleStatusChange(transaction, "rejected")}
        />
        <RequestTable
          title="Withdrawal History"
          tone="withdrawal"
          emptyText="No withdrawal requests found."
          transactions={withdrawals}
          members={members}
          canApprove={canApprove}
          isProcessingId={isProcessingId}
          amountSort={withdrawalSort}
          onAmountSortChange={setWithdrawalSort}
          onViewDetails={setDetailTransaction}
          onApprove={(transaction) => handleStatusChange(transaction, "approved")}
          onReject={(transaction) => handleStatusChange(transaction, "rejected")}
        />
      </div>

      {detailTransaction && (
        <TransactionReceiptModal transaction={detailTransaction} member={members.find((item) => item.username === detailTransaction.member)} onClose={() => setDetailTransaction(null)} />
      )}
    </Panel>
  );
}

function sortTransactions(transactions: Transaction[], amountSort: AmountSort) {
  return [...transactions].sort((left, right) => {
    if (amountSort !== "none") {
      const difference = left.amount - right.amount;
      return amountSort === "asc" ? difference : -difference;
    }

    return new Date(right.createdAt.replace(" ", "T")).getTime() - new Date(left.createdAt.replace(" ", "T")).getTime();
  });
}

function RequestTable({
  title,
  tone,
  emptyText,
  transactions,
  members,
  canApprove,
  isProcessingId,
  amountSort,
  onAmountSortChange,
  onViewDetails,
  onApprove,
  onReject,
}: {
  title: string;
  tone: "topup" | "withdrawal";
  emptyText: string;
  transactions: Transaction[];
  members: Member[];
  canApprove: boolean;
  isProcessingId: string | null;
  amountSort: AmountSort;
  onAmountSortChange: (value: AmountSort) => void;
  onViewDetails: (transaction: Transaction) => void;
  onApprove: (transaction: Transaction) => void;
  onReject: (transaction: Transaction) => void;
}) {
  const headerTone = tone === "topup" ? "from-emerald-950 to-slate-900" : "from-slate-950 to-slate-800";
  const visibleTransactions = transactions;
  const colSpan = tone === "topup" ? 8 : 6;

  return (
    <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4">
        <div>
          <h3 className="text-lg font-black text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">Review request details, proof, and approval status.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AmountSortControls value={amountSort} onChange={onAmountSortChange} label="amount" />
          <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
            {transactions.length} records
          </span>
        </div>
      </div>

      <div className="max-h-[460px] overflow-auto">
        <table className="min-w-[1020px] w-full border-separate border-spacing-0 text-left text-[13px]">
          <thead className={`sticky top-0 z-20 bg-gradient-to-r ${headerTone} text-xs uppercase text-white shadow-sm`}>
            {tone === "topup" ? (
              <tr>
                <Th className="w-[170px]">Code</Th>
                <Th className="w-[170px]">User</Th>
                <Th className="w-[150px]">Sender</Th>
                <Th className="w-[130px]">Amount</Th>
                <Th>Transfer Proof / Note</Th>
                <Th>Payment Method</Th>
                <Th className="w-[110px]">Status</Th>
                <Th className="sticky right-0 z-30 w-[150px] bg-slate-900 shadow-[-10px_0_18px_rgba(15,23,42,0.16)]">Action</Th>
              </tr>
            ) : (
              <tr>
                <Th className="w-[190px]">Code</Th>
                <Th className="w-[170px]">User</Th>
                <Th className="w-[140px]">Amount</Th>
                <Th>Withdrawal Information</Th>
                <Th className="w-[110px]">Status</Th>
                <Th className="sticky right-0 z-30 w-[150px] bg-slate-900 shadow-[-10px_0_18px_rgba(15,23,42,0.16)]">Action</Th>
              </tr>
            )}
          </thead>
          <tbody>
            {visibleTransactions.length ? (
              visibleTransactions.map((transaction) => {
                const member = members.find((item) => item.username === transaction.member);
                const isPending = transaction.status === "pending";
                const isProcessing = isProcessingId === transaction.id;

                return (
                  <tr key={transaction.id} className={`group align-middle transition hover:bg-slate-50 ${statusRowClass(transaction.status)}`}>
                    <Td className="border-t border-slate-200">
                      <span className="block max-w-[170px] break-words font-black leading-5 text-forest">{transaction.requestId ?? transaction.id}</span>
                    </Td>
                    <Td className="border-t border-slate-200">
                      <p className="max-w-[160px] break-words font-black text-slate-900">{transaction.member}</p>
                      <p className="max-w-[160px] break-words text-xs text-slate-500">{member?.phone ?? "No phone"} · {transaction.admin}</p>
                    </Td>
                    {tone === "topup" ? (
                      <>
                        <Td className="border-t border-slate-200">
                          <span className="block max-w-[130px] break-words">{transaction.senderName || "-"}</span>
                        </Td>
                        <Td className="border-t border-slate-200">
                          <span className="whitespace-nowrap text-base font-black text-forest">{formatRupiah(transaction.amount)}</span>
                        </Td>
                        <Td className="border-t border-slate-200">
                          <ProofCell transaction={transaction} onViewDetails={onViewDetails} />
                        </Td>
                        <Td className="border-t border-slate-200">
                          <PaymentMethodCell transaction={transaction} />
                        </Td>
                        <Td className="border-t border-slate-200">
                          <StatusBadge status={transaction.status} />
                        </Td>
                      </>
                    ) : (
                      <>
                        <Td className="border-t border-slate-200">
                          <span className="whitespace-nowrap text-base font-black text-forest">{formatRupiah(transaction.amount)}</span>
                        </Td>
                        <Td className="border-t border-slate-200">
                          <WithdrawalInfoCell transaction={transaction} />
                        </Td>
                        <Td className="border-t border-slate-200">
                          <StatusBadge status={transaction.status} />
                        </Td>
                      </>
                    )}
                    <Td className={`sticky right-0 border-t border-slate-200 shadow-[-10px_0_18px_rgba(15,23,42,0.08)] ${statusStickyClass(transaction.status)} group-hover:bg-slate-50`}>
                      <div className="grid min-w-[132px] gap-2">
                        <button className="inline-flex items-center justify-center gap-1 rounded border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => onViewDetails(transaction)}>
                          <ReceiptText size={14} />
                          Details
                        </button>
                        {isPending && canApprove && (
                          <>
                            <button disabled={isProcessing} className="inline-flex items-center justify-center gap-1 rounded bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300" onClick={() => onApprove(transaction)}>
                              <CheckCircle2 size={14} />
                              Approve
                            </button>
                            <button disabled={isProcessing} className="inline-flex items-center justify-center gap-1 rounded bg-rose-600 px-3 py-2 text-xs font-black text-white disabled:bg-slate-300" onClick={() => onReject(transaction)}>
                              <XCircle size={14} />
                              Reject
                            </button>
                          </>
                        )}
                        {isPending && !canApprove && <span className="rounded bg-slate-100 px-3 py-2 text-xs font-black text-slate-400">Super Admin only</span>}
                      </div>
                    </Td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={colSpan} className="p-6 text-center text-sm text-slate-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statusRowClass(status: Transaction["status"]) {
  if (status === "pending") return "bg-amber-50/70";
  if (status === "approved") return "bg-emerald-50/55";
  return "bg-rose-50/45";
}

function statusStickyClass(status: Transaction["status"]) {
  if (status === "pending") return "bg-amber-50";
  if (status === "approved") return "bg-emerald-50";
  return "bg-rose-50";
}

function ProofCell({ transaction, onViewDetails }: { transaction: Transaction; onViewDetails: (transaction: Transaction) => void }) {
  if (transaction.proofDataUrl) {
    return (
      <button className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50" onClick={() => onViewDetails(transaction)}>
        <Eye size={14} />
        View proof
      </button>
    );
  }

  if (transaction.proofName) {
    return <span className="text-xs font-semibold text-slate-500">{transaction.proofName}</span>;
  }

  return <span className="text-xs text-slate-400">No proof</span>;
}

function PaymentMethodCell({ transaction }: { transaction: Transaction }) {
  return (
    <span className="block max-w-[260px] whitespace-pre-line leading-5 text-slate-800">
      {transaction.proofName ? `Proof file: ${transaction.proofName}` : "Pending bank transfer verification"}
      <span className="block text-xs text-slate-500">Created: {shortDate(transaction.createdAt)}</span>
    </span>
  );
}

function WithdrawalInfoCell({ transaction }: { transaction: Transaction }) {
  return (
    <span className="block max-w-[330px] whitespace-pre-line leading-5">
      Recipient: {transaction.withdrawalAccountName || "-"}
      {"\n"}Bank: {transaction.withdrawalBankName || "-"}
      {"\n"}Account No: {transaction.withdrawalAccountNumber || "-"}
      {"\n"}Created: {shortDate(transaction.createdAt)}
    </span>
  );
}

function StatusBadge({ status }: { status: Transaction["status"] }) {
  const styles: Record<Transaction["status"], string> = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
  };
  return <span className={`rounded px-2 py-1 text-xs font-black capitalize ${styles[status]}`}>{status}</span>;
}

function TransactionReceiptModal({ transaction, member, onClose }: { transaction: Transaction; member?: Member; onClose: () => void }) {
  const proofDownloadName = transaction.proofName || `${transaction.requestId ?? transaction.id}-proof.png`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded bg-white shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded bg-mint text-forest">
              <ReceiptText size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-forest">{transaction.type === "topup" ? "Top Up request" : "Withdrawal request"}</p>
              <h2 className="text-xl font-black text-slate-900">{transaction.requestId ?? transaction.id}</h2>
            </div>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded hover:bg-slate-100" onClick={onClose} aria-label="Close request details">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-800">Request details</p>
            <div className="mt-4 grid gap-3">
              <ReceiptRow label="Status" value={transaction.status} />
              <ReceiptRow label="Customer/User" value={transaction.member} />
              <ReceiptRow label="Phone" value={member?.phone ?? "-"} />
              <ReceiptRow label="Admin scope" value={transaction.admin} />
              <ReceiptRow label="Sender name" value={transaction.senderName || "-"} />
              {transaction.type === "withdrawal" && (
                <>
                  <ReceiptRow label="Bank name" value={transaction.withdrawalBankName || "-"} />
                  <ReceiptRow label="Account holder" value={transaction.withdrawalAccountName || "-"} />
                  <ReceiptRow label="Account number" value={transaction.withdrawalAccountNumber || "-"} />
                </>
              )}
              <ReceiptRow label="Amount" value={formatRupiah(transaction.amount)} strong />
              <ReceiptRow label="Created date" value={shortDate(transaction.createdAt)} />
              <ReceiptRow label="Proof file" value={transaction.proofName || "No proof filename"} />
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-black text-slate-800">Payment proof image/link</p>
              {transaction.proofDataUrl && (
                <a className="inline-flex items-center gap-1 rounded bg-forest px-3 py-2 text-xs font-black text-white" href={transaction.proofDataUrl} download={proofDownloadName}>
                  <Download size={14} />
                  Save proof
                </a>
              )}
            </div>
            {transaction.proofDataUrl ? (
              <a href={transaction.proofDataUrl} target="_blank" rel="noreferrer">
                <img className="max-h-[520px] w-full rounded border border-slate-100 object-contain" src={transaction.proofDataUrl} alt="Payment proof uploaded by member" />
              </a>
            ) : (
              <div className="grid min-h-72 place-items-center rounded bg-slate-50 text-center text-sm text-slate-500">
                <div>
                  <ReceiptText className="mx-auto mb-3 text-slate-300" size={42} />
                  <p className="font-bold">No image proof stored for this request.</p>
                  <p className="mt-1">Older records may only have filename/type metadata.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <span className={`text-right text-sm capitalize ${strong ? "text-lg font-black text-forest" : "font-bold text-slate-800"}`}>{value}</span>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-3 font-black ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-4 ${className}`}>{children}</td>;
}
