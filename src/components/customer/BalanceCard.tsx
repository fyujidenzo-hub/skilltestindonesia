import { formatRupiah } from "../../utils";

interface BalanceCardProps {
  balance: number;
  onTopUp: () => void;
  onWithdraw: () => void;
}

export default function BalanceCard({ balance, onTopUp, onWithdraw }: BalanceCardProps) {
  return (
    <div className="rounded-[1.6rem] bg-white/95 p-5 text-ink shadow-[0_20px_56px_rgba(15,23,42,0.18)] ring-1 ring-white/80 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">Saldo anggota</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{formatRupiah(balance)}</p>
          <p className="mt-1 text-xs font-bold uppercase text-slate-400">IDR • Rupiah</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase text-forest ring-1 ring-emerald-100">Aktif</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button className="rounded-2xl bg-forest px-3 py-3 text-sm font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-panel" onClick={onTopUp}>
         Isi ulang
        </button>
        <button className="rounded-2xl bg-coral px-3 py-3 text-sm font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-panel" onClick={onWithdraw}>
          Menarik
        </button>
      </div>
    </div>
  );
}
