import { AlertTriangle, BadgeDollarSign, Banknote, Pencil, Plus, ShieldCheck, Trash2, UserPlus, WalletCards, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel } from "../common";
import { useAppStore } from "../../store/AppStore";
import type { AppState } from "../../types";
import { formatRupiah } from "../../utils";
import { deleteBank } from "../../services/banksService";
import BankForm from "./BankForm";
import StatCard from "./StatCard";

interface OverviewPanelProps {
  state: AppState;
  canManageBanks?: boolean;
  totals: {
    registrations: number;
    todayDeposits: number;
    monthDeposits: number;
    todayWithdrawals: number;
    monthWithdrawals: number;
  };
}

export default function OverviewPanel({ state, totals, canManageBanks = false }: OverviewPanelProps) {
  const { dispatch } = useAppStore();
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState("");
  const [deletingBankId, setDeletingBankId] = useState("");
  const [bankMessage, setBankMessage] = useState("");
  const [bankToDelete, setBankToDelete] = useState<AppState["banks"][number] | null>(null);

  const handleConfirmDeleteBank = async () => {
    if (!bankToDelete) return;

    setDeletingBankId(bankToDelete.id);
    setBankMessage("");

    try {
      await deleteBank(bankToDelete.id);
      dispatch({ type: "deleteBank", payload: { id: bankToDelete.id } });
      if (editingBankId === bankToDelete.id) setEditingBankId("");
      setBankToDelete(null);
      setBankMessage("Bank account deleted successfully.");
    } catch (error) {
      console.error("Failed to delete bank account:", error);
      setBankMessage("Unable to delete bank account. Check Firestore bank rules.");
    } finally {
      setDeletingBankId("");
    }
  };
  const maxRegistrations = Math.max(1, ...state.admins.map((admin) => admin.registrations));
  const maxDailyFinance = Math.max(1, ...state.admins.flatMap((admin) => [admin.todayDeposits, admin.todayWithdrawals]));
  const pendingTransactions = state.transactions.filter((transaction) => transaction.status === "pending").length;
  const approvedTransactions = state.transactions.filter((transaction) => transaction.status === "approved").length;
  const rejectedTransactions = state.transactions.filter((transaction) => transaction.status === "rejected").length;
  const totalTransactions = Math.max(1, state.transactions.length);
  const financeTrend = useMemo(() => buildFinanceTrend(state.transactions), [state.transactions]);
  const maxMonthlyFinance = Math.max(1, ...state.admins.flatMap((admin) => [admin.monthDeposits, admin.monthWithdrawals]));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<UserPlus />} label="New registrations" value={`${totals.registrations} people`} />
        <StatCard icon={<BadgeDollarSign />} label="Today deposits" value={formatRupiah(totals.todayDeposits)} />
        <StatCard icon={<WalletCards />} label="Monthly deposits" value={formatRupiah(totals.monthDeposits)} />
        <StatCard icon={<Banknote />} label="Today withdrawals" value={formatRupiah(totals.todayWithdrawals)} />
        <StatCard icon={<ShieldCheck />} label="Monthly releases" value={formatRupiah(totals.monthWithdrawals)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title="Registration Analytics">
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <AnalyticsPill label="Total registrations" value={String(totals.registrations)} />
            <AnalyticsPill label="Top performer" value={getTopAdmin(state.admins)?.name ?? "-"} />
            <AnalyticsPill label="Active admins" value={String(state.admins.length)} />
          </div>
          <div className="space-y-4">
            {state.admins.length ? (
              state.admins.map((admin) => (
                <RegistrationBar
                  key={admin.id}
                  label={admin.name}
                  sublabel={`Code ${admin.adminCode ?? admin.code}`}
                  value={`${admin.registrations} people`}
                  percent={(admin.registrations / maxRegistrations) * 100}
                />
              ))
            ) : (
              <EmptyChart text="No admin registration data yet." />
            )}
          </div>
        </Panel>

        <Panel title="Transaction Status">
          <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center xl:grid-cols-1 2xl:grid-cols-[180px_1fr]">
            <StatusDonut approved={approvedTransactions} pending={pendingTransactions} rejected={rejectedTransactions} />
            <div className="space-y-3">
              <StatusLegend label="Approved" value={approvedTransactions} total={totalTransactions} color="bg-emerald-500" />
              <StatusLegend label="Pending" value={pendingTransactions} total={totalTransactions} color="bg-amber-500" />
              <StatusLegend label="Rejected" value={rejectedTransactions} total={totalTransactions} color="bg-coral" />
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Admin Performance" action={<button className="rounded border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-forest hover:bg-emerald-100" onClick={() => window.print()}>Export report</button>}>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <PerformanceSummary label="Active admins" value={String(state.admins.length)} tone="slate" />
            <PerformanceSummary label="Registrations" value={String(totals.registrations)} tone="green" />
            <PerformanceSummary label="Pending requests" value={String(pendingTransactions)} tone="amber" />
          </div>

          <div className="mb-6 rounded bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Setoran harian vs. pencairan</p>
                <p className="mt-1 text-sm text-slate-500">Bandingkan arus masuk dan keluar uang hari ini per admin.</p>
              </div>
              <div className="flex gap-3 text-xs font-black">
                <span className="inline-flex items-center gap-1.5 text-emerald-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Deposit</span>
                <span className="inline-flex items-center gap-1.5 text-coral"><span className="h-2.5 w-2.5 rounded-full bg-coral" /> Release</span>
              </div>
            </div>
            {state.admins.length ? (
              state.admins.map((admin) => (
                <div key={admin.id} className="mb-4 last:mb-0 rounded bg-white p-3 shadow-sm ring-1 ring-slate-100">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-800">{admin.name}</p>
                      <p className="text-xs font-semibold text-slate-400">Code {admin.adminCode ?? admin.code}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs font-black text-slate-600">
                      <span className="text-emerald-700">{formatRupiah(admin.todayDeposits)}</span>
                      <span className="mx-1 text-slate-300">/</span>
                      <span className="text-coral">{formatRupiah(admin.todayWithdrawals)}</span>
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(admin.todayDeposits ? 5 : 0, (admin.todayDeposits / maxDailyFinance) * 100)}%` }} />
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-coral" style={{ width: `${Math.max(admin.todayWithdrawals ? 5 : 0, (admin.todayWithdrawals / maxDailyFinance) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyChart text="Belum ada data keuangan harian." />
            )}
          </div>

          <div className="mb-6 rounded bg-gradient-to-br from-[#05251f] via-[#083a30] to-[#0b5d45] p-4 text-white shadow-sm ring-1 ring-emerald-300/20">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-emerald-100">Grafik keuangan</p>
                <p className="mt-1 text-sm text-white/65">Pergerakan isi ulang dan penarikan selama 7 hari berdasarkan catatan permintaan.</p>
              </div>
              <div className="flex gap-3 text-xs font-black">
                <span className="inline-flex items-center gap-1.5 text-emerald-200"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> Isi ulang</span>
                <span className="inline-flex items-center gap-1.5 text-lime-200"><span className="h-2.5 w-2.5 rounded-full bg-lime-300" /> Penarikan</span>
              </div>
            </div>
            <FinanceTrendChart data={financeTrend} />
          </div>

          <div className="mb-6 rounded bg-white p-4 ring-1 ring-slate-100">
            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Perbandingan keuangan bulanan</p>
              <p className="mt-1 text-sm text-slate-500">Penyetoran dan pelepasan lintas cakupan administratif.</p>
            </div>
            <div className="space-y-3">
              {state.admins.length ? (
                state.admins.map((admin) => (
                  <StackedFinanceBar key={admin.id} admin={admin} max={maxMonthlyFinance} />
                ))
              ) : (
                <EmptyChart text="No monthly finance data yet." />
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <PerformanceTh>Admin</PerformanceTh>
                  <PerformanceTh>Kode agensi</PerformanceTh>
                  <PerformanceTh>Kode undangan</PerformanceTh>
                  <PerformanceTh>Bonus pendaftaran</PerformanceTh>
                  <PerformanceTh>Pendaftaran</PerformanceTh>
                  <PerformanceTh>Deposit hari ini</PerformanceTh>
                  <PerformanceTh>Pencairan hari ini</PerformanceTh>
                </tr>
              </thead>
              <tbody>
                {state.admins.map((admin) => (
                  <tr key={admin.id} className="group">
                    <PerformanceTd className="font-black text-slate-900">{admin.name}</PerformanceTd>
                    <PerformanceTd>{admin.adminCode ?? admin.code}</PerformanceTd>
                    <PerformanceTd>{admin.invitationCode ?? admin.code}</PerformanceTd>
                    <PerformanceTd>{formatRupiah(admin.registrationBonus ?? 0)}</PerformanceTd>
                    <PerformanceTd>
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{admin.registrations}</span>
                    </PerformanceTd>
                    <PerformanceTd className="font-black text-emerald-700">{formatRupiah(admin.todayDeposits)}</PerformanceTd>
                    <PerformanceTd className="font-black text-coral">{formatRupiah(admin.todayWithdrawals)}</PerformanceTd>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {canManageBanks && (
          <Panel
            title="Deposit Bank Placements"
            action={
              <button
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-forest hover:bg-emerald-100"
                onClick={() => {
                  setEditingBankId("");
                  setBankMessage("");
                  setShowBankForm(!showBankForm);
                }}
              >
                <Plus size={16} /> AMenambahkan
              </button>
            }
          >
            {showBankForm && <BankForm onDone={() => setShowBankForm(false)} />}

            {bankMessage && (
              <p className={`mt-3 rounded px-3 py-2 text-sm font-bold ${bankMessage.startsWith("Unable") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {bankMessage}
              </p>
            )}

            <div className="mt-3 space-y-3">
              {state.banks.length ? (
                state.banks.map((bank) => (
                  <div key={bank.id} className="rounded-2xl border border-slate-200 p-3 sm:p-4">
                    <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                      <div className="min-w-0">
                        <p className="break-words font-bold">{bank.bank}</p>
                        <p className="break-words text-sm text-slate-500">{bank.accountName}</p>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${bank.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {bank.active ? "Aktif" : "Dijeda"}
                      </span>
                    </div>
                    <p className="mt-3 break-all rounded-xl bg-slate-50 px-3 py-2 text-base font-black text-slate-900 sm:text-lg">{bank.accountNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">Setoran minimum {formatRupiah(bank.minDeposit)}</p>

                    <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                      <button
                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setShowBankForm(false);
                          setBankMessage("");
                          setEditingBankId(editingBankId === bank.id ? "" : bank.id);
                        }}
                      >
                        <Pencil size={13} />
                        Sunting
                      </button>

                      <button
                        className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                        disabled={deletingBankId === bank.id}
                        onClick={() => {
                          setBankMessage("");
                          setBankToDelete(bank);
                        }}
                      >
                        <Trash2 size={13} />
                        {deletingBankId === bank.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    {editingBankId === bank.id && (
                      <div className="mt-3">
                        <BankForm bank={bank} onDone={() => setEditingBankId("")} />
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">Belum ada penempatan bank. Tambahkan satu untuk menampilkan instruksi deposit di toko pelanggan.</p>
              )}
            </div>
          </Panel>
        )}
      </div>

      {bankToDelete && (
        <DeleteBankDialog
          bank={bankToDelete}
          isDeleting={deletingBankId === bankToDelete.id}
          onCancel={() => {
            if (deletingBankId) return;
            setBankToDelete(null);
          }}
          onConfirm={handleConfirmDeleteBank}
        />
      )}
    </div>
  );
}

function DeleteBankDialog({
  bank,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  bank: AppState["banks"][number];
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-950/60 px-0 py-0 sm:items-center sm:px-4 sm:py-6">
      <div className="max-h-[calc(100dvh-0.75rem)] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.32)] sm:max-h-[calc(100vh-3rem)] sm:max-w-md sm:rounded-3xl">
        <div className="bg-gradient-to-br from-rose-50 to-white p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-100 text-rose-700 sm:h-12 sm:w-12">
              <AlertTriangle size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-rose-600">Hapus rekening bank</p>
              <h3 className="mt-1 text-lg font-black leading-tight text-slate-900 sm:text-xl">Apa kamu yakin?</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Rekening bank ini akan segera dihapus dari instruksi isi ulang pelanggan.
              </p>
            </div>

            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-slate-500 shadow-sm hover:bg-slate-100 disabled:opacity-50"
              onClick={onCancel}
              disabled={isDeleting}
              aria-label="Close delete bank dialog"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase text-slate-500">Rekening bank</p>
            <p className="mt-1 break-words text-lg font-black text-slate-900">{bank.bank}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-600">{bank.accountName}</p>
            <p className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-sm font-black text-forest">{bank.accountNumber}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">Setoran minimum {formatRupiah(bank.minDeposit)}</p>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold leading-6 text-amber-800">
            Tindakan ini tidak dapat dibatalkan dari panel admin.
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              className="order-2 rounded-2xl border border-slate-200 px-4 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:order-1"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Membatalkan
            </button>
            <button
              type="button"
              className="order-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-700 disabled:bg-slate-400 sm:order-2"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              <Trash2 size={17} />
              {isDeleting ? "Deleting..." : "Delete bank"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-slate-50 p-3 ring-1 ring-slate-100">
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function RegistrationBar({ label, sublabel, value, percent }: { label: string; sublabel: string; value: string; percent: number }) {
  return (
    <div className="rounded border border-slate-100 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm">
        <div className="min-w-0">
          <span className="block truncate font-black text-slate-800">{label}</span>
          <span className="block text-xs font-semibold text-slate-400">{sublabel}</span>
        </div>
        <span className="shrink-0 rounded bg-mint px-2 py-1 text-xs font-black text-forest">{value}</span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-forest to-emerald-400" style={{ width: `${Math.max(6, percent)}%` }} />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.25)_50%,rgba(255,255,255,.25)_75%,transparent_75%)] bg-[length:20px_20px] opacity-40" />
      </div>
      <p className="mt-2 text-right text-[11px] font-black text-slate-400">{Math.round(percent)}% of top admin</p>
    </div>
  );
}

function StatusDonut({ approved, pending, rejected }: { approved: number; pending: number; rejected: number }) {
  const total = Math.max(1, approved + pending + rejected);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const approvedSize = (approved / total) * circumference;
  const pendingSize = (pending / total) * circumference;
  const rejectedSize = (rejected / total) * circumference;
  const approvedOffset = 0;
  const pendingOffset = -approvedSize;
  const rejectedOffset = -(approvedSize + pendingSize);

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg className="-rotate-90" viewBox="0 0 140 140" role="img" aria-label="Transaction status donut chart">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#eef2f7" strokeWidth="18" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#10b981" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${approvedSize} ${circumference - approvedSize}`} strokeDashoffset={approvedOffset} />
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#f59e0b" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${pendingSize} ${circumference - pendingSize}`} strokeDashoffset={pendingOffset} />
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#fb6b5b" strokeWidth="18" strokeLinecap="round" strokeDasharray={`${rejectedSize} ${circumference - rejectedSize}`} strokeDashoffset={rejectedOffset} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-3xl font-black text-slate-900">{approved + pending + rejected}</p>
          <p className="text-xs font-black uppercase text-slate-400">Requests</p>
        </div>
      </div>
    </div>
  );
}

function StatusLegend({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percent = (value / total) * 100;
  return (
    <div className="rounded bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="inline-flex items-center gap-2 font-black text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${color}`} />{label}</span>
        <span className="text-xs font-black text-slate-500">{value} / {Math.round(percent)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(value ? 5 : 0, percent)}%` }} />
      </div>
    </div>
  );
}

type FinanceTrendPoint = { label: string; topup: number; withdrawal: number };
type ChartPoint = { x: number; y: number };

function FinanceTrendChart({ data }: { data: FinanceTrendPoint[] }) {
  const width = 720;
  const areaHeight = 180;
  const lineHeight = 150;
  const padding = 26;
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.topup, item.withdrawal]));
  const topupPoints = getChartPoints(data, "topup", width, areaHeight, padding, maxValue);
  const withdrawalPoints = getChartPoints(data, "withdrawal", width, areaHeight, padding, maxValue);
  const compactTopupPoints = getChartPoints(data, "topup", width, lineHeight, padding, maxValue);
  const compactWithdrawalPoints = getChartPoints(data, "withdrawal", width, lineHeight, padding, maxValue);

  return (
    <div className="grid gap-4">
      <div className="rounded bg-white/8 p-3 ring-1 ring-white/10 backdrop-blur sm:p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black text-white">Alur pengisian saldo dan penarikan</p>
            <p className="text-xs font-semibold text-emerald-100/70">Tampilan tren berisi (filled), disesuaikan skalanya untuk desktop dan perangkat seluler.</p>
          </div>
          <p className="text-xs font-black text-emerald-100">Peak: {formatRupiah(maxValue)}</p>
        </div>
        <svg className="block h-auto w-full" viewBox={`0 0 ${width} ${areaHeight}`} role="img" aria-label="Responsive seven day finance area chart" preserveAspectRatio="none">
          <defs>
            <linearGradient id="financeTopupFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="financeWithdrawalFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#bef264" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#84cc16" stopOpacity="0.08" />
            </linearGradient>
          </defs>
          <ChartGrid width={width} height={areaHeight} padding={padding} />
          <path d={areaPath(withdrawalPoints, areaHeight, padding)} fill="url(#financeWithdrawalFill)" />
          <path d={areaPath(topupPoints, areaHeight, padding)} fill="url(#financeTopupFill)" />
          <path d={smoothPath(withdrawalPoints)} fill="none" stroke="#bef264" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={smoothPath(topupPoints)} fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <ChartLabels data={data} width={width} height={areaHeight} padding={padding} />
        </svg>
      </div>

      <div className="rounded bg-[#06251f]/85 p-3 ring-1 ring-emerald-300/15 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-black text-white">Baris aktivitas permintaan</p>
          <div className="flex gap-3 text-[11px] font-black uppercase tracking-wide">
            <span className="inline-flex items-center gap-1.5 text-emerald-200"><span className="h-2 w-5 rounded-full bg-emerald-400" /> Top-up</span>
            <span className="inline-flex items-center gap-1.5 text-lime-200"><span className="h-2 w-5 rounded-full bg-lime-300" /> Withdrawal</span>
          </div>
        </div>
        <svg className="block h-auto w-full" viewBox={`0 0 ${width} ${lineHeight}`} role="img" aria-label="Responsive seven day finance line chart" preserveAspectRatio="none">
          <ChartGrid width={width} height={lineHeight} padding={padding} />
          <path d={smoothPath(compactTopupPoints)} fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <path d={smoothPath(compactWithdrawalPoints)} fill="none" stroke="#bef264" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          {compactTopupPoints.map((point, index) => (
            <circle key={`topup-${data[index].label}`} cx={point.x} cy={point.y} r="4" fill="#34d399" stroke="#06251f" strokeWidth="2" />
          ))}
          {compactWithdrawalPoints.map((point, index) => (
            <circle key={`withdrawal-${data[index].label}`} cx={point.x} cy={point.y} r="4" fill="#bef264" stroke="#06251f" strokeWidth="2" />
          ))}
          <ChartLabels data={data} width={width} height={lineHeight} padding={padding} />
        </svg>
      </div>
    </div>
  );
}

function ChartGrid({ width, height, padding }: { width: number; height: number; padding: number }) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((line) => {
        const y = padding + line * ((height - padding * 2) / 4);
        return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} stroke="rgba(209,250,229,.16)" />;
      })}
    </>
  );
}

function ChartLabels({ data, width, height, padding }: { data: FinanceTrendPoint[]; width: number; height: number; padding: number }) {
  const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  return (
    <>
      {data.map((item, index) => (
        <text key={item.label} x={padding + index * xStep} y={height - 6} textAnchor="middle" fill="rgba(209,250,229,.62)" fontSize="11" fontWeight="800">
          {item.label}
        </text>
      ))}
    </>
  );
}

function getChartPoints(data: FinanceTrendPoint[], key: "topup" | "withdrawal", width: number, height: number, padding: number, maxValue: number): ChartPoint[] {
  const xStep = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;
  return data.map((item, index) => ({
    x: padding + index * xStep,
    y: height - padding - (item[key] / maxValue) * (height - padding * 2),
  }));
}

function smoothPath(points: ChartPoint[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const controlX = (previous.x + point.x) / 2;
    return `${path} C ${controlX} ${previous.y}, ${controlX} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

function areaPath(points: ChartPoint[], height: number, padding: number) {
  if (!points.length) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${smoothPath(points)} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;
}

function StackedFinanceBar({ admin, max }: { admin: AppState["admins"][number]; max: number }) {
  const depositPercent = (admin.monthDeposits / max) * 100;
  const withdrawalPercent = (admin.monthWithdrawals / max) * 100;
  return (
    <div className="rounded border border-slate-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-black text-slate-800">{admin.name}</p>
        <p className="shrink-0 text-xs font-black text-slate-500">{formatRupiah(admin.monthDeposits)} / {formatRupiah(admin.monthWithdrawals)}</p>
      </div>
      <div className="grid gap-1">
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-forest to-emerald-400" style={{ width: `${Math.max(admin.monthDeposits ? 5 : 0, depositPercent)}%` }} />
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-coral to-rose-400" style={{ width: `${Math.max(admin.monthWithdrawals ? 5 : 0, withdrawalPercent)}%` }} />
        </div>
      </div>
    </div>
  );
}

function getTopAdmin(admins: AppState["admins"]) {
  return [...admins].sort((left, right) => right.registrations - left.registrations)[0];
}

function buildFinanceTrend(transactions: AppState["transactions"]) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), topup: 0, withdrawal: 0 };
  });

  transactions.forEach((transaction) => {
    const key = transaction.createdAt.slice(0, 10);
    const day = days.find((item) => item.key === key);
    if (!day) return;
    if (transaction.type === "topup") day.topup += transaction.amount;
    if (transaction.type === "withdrawal") day.withdrawal += transaction.amount;
  });

  return days;
}

function PerformanceSummary({ label, value, tone }: { label: string; value: string; tone: "slate" | "green" | "amber" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  }[tone];

  return (
    <div className={`rounded p-4 ring-1 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function PerformanceTh({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-black first:rounded-l last:rounded-r">{children}</th>;
}

function PerformanceTd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-4 py-4 align-middle group-hover:bg-slate-50 ${className}`}>{children}</td>;
}

function EmptyChart({ text }: { text: string }) {
  return <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">{text}</p>;
}
