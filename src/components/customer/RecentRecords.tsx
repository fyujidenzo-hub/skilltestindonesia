import type { Transaction } from "../../types";
import { formatRupiah, shortDate } from "../../utils";

export default function RecentRecords({ transactions }: { transactions: Transaction[] }) {
  const records = [...transactions]
    .sort((left, right) => parseRecordTime(right.createdAt) - parseRecordTime(left.createdAt))
    .slice(0, 4);

  return (
    <section id="records" className="rounded bg-white p-5 shadow-panel">
      <h2 className="text-lg font-black">Rekor Terbaru</h2>
      <div className="mt-3 space-y-2">
        {records.length ? (
          records.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-black text-slate-900">{getRecordLabel(transaction)}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">
                  {transaction.status === "pending" ? "Pending" : transaction.status === "rejected" ? "Ditolak" : "Disetujui"}
                  {transaction.createdAt ? ` · ${shortDate(transaction.createdAt)}` : ""}
                </p>
              </div>
              <span className={`shrink-0 font-black ${transaction.type === "withdrawal" ? "text-coral" : "text-forest"}`}>
                {formatRupiah(transaction.amount)}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
            Belum ada riwayat transaksi.
          </div>
        )}
      </div>
    </section>
  );
}

function getRecordLabel(transaction: Transaction) {
  if (transaction.type === "reward") return "Balance Reward";
  if (transaction.type === "topup") return "Balance Top-up";
  return "Balance Withdrawal";
}

function parseRecordTime(value: string) {
  const parsed = new Date(value.replace(" ", "T")).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
