import type { Transaction } from "../../types";
import { formatRupiah, shortDate } from "../../utils";

export default function RecentRecords({ transactions }: { transactions: Transaction[] }) {
  const records = [...transactions]
    .sort((left, right) => parseRecordTime(right.createdAt) - parseRecordTime(left.createdAt))
    .slice(0, 4);

  return (
    <section id="records" className="overflow-hidden rounded-[1.5rem] bg-white/95 p-4 shadow-[0_18px_54px_rgba(15,23,42,0.08)] ring-1 ring-white/80 backdrop-blur sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-forest">Aktivitas akun</p>
          <h2 className="mt-1 text-lg font-black text-slate-950">Rekor Terbaru</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{records.length} data</span>
      </div>
      <div className="mt-4 space-y-2">
        {records.length ? (
          records.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
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
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
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
