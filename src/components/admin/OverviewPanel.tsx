import { BadgeDollarSign, Banknote, Pencil, Plus, ShieldCheck, UserPlus, WalletCards } from "lucide-react";
import { useState } from "react";
import { Panel } from "../common";
import type { AppState } from "../../types";
import { formatRupiah } from "../../utils";
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
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState("");
  const maxRegistrations = Math.max(1, ...state.admins.map((admin) => admin.registrations));
  const maxDailyFinance = Math.max(1, ...state.admins.flatMap((admin) => [admin.todayDeposits, admin.todayWithdrawals]));
  const pendingTransactions = state.transactions.filter((transaction) => transaction.status === "pending").length;
  const approvedTransactions = state.transactions.filter((transaction) => transaction.status === "approved").length;
  const rejectedTransactions = state.transactions.filter((transaction) => transaction.status === "rejected").length;
  const totalTransactions = Math.max(1, state.transactions.length);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<UserPlus />} label="New registrations" value={`${totals.registrations} people`} />
        <StatCard icon={<BadgeDollarSign />} label="Today deposits" value={formatRupiah(totals.todayDeposits)} />
        <StatCard icon={<WalletCards />} label="Monthly deposits" value={formatRupiah(totals.monthDeposits)} />
        <StatCard icon={<Banknote />} label="Today withdrawals" value={formatRupiah(totals.todayWithdrawals)} />
        <StatCard icon={<ShieldCheck />} label="Monthly releases" value={formatRupiah(totals.monthWithdrawals)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Registration Growth">
          <div className="space-y-4">
            {state.admins.length ? (
              state.admins.map((admin) => (
                <ChartBar
                  key={admin.id}
                  label={admin.name}
                  value={`${admin.registrations} people`}
                  percent={(admin.registrations / maxRegistrations) * 100}
                  tone="green"
                />
              ))
            ) : (
              <EmptyChart text="No admin registration data yet." />
            )}
          </div>
        </Panel>

        <Panel title="Transaction Status">
          <div className="space-y-4">
            <DonutRow label="Approved" value={approvedTransactions} percent={(approvedTransactions / totalTransactions) * 100} className="bg-emerald-500" />
            <DonutRow label="Pending" value={pendingTransactions} percent={(pendingTransactions / totalTransactions) * 100} className="bg-amber-500" />
            <DonutRow label="Rejected" value={rejectedTransactions} percent={(rejectedTransactions / totalTransactions) * 100} className="bg-coral" />
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
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Daily deposits vs releases</p>
                <p className="mt-1 text-sm text-slate-500">Compare today’s money in and money out per admin.</p>
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
              <EmptyChart text="No daily finance data yet." />
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <PerformanceTh>Admin</PerformanceTh>
                  <PerformanceTh>Agency code</PerformanceTh>
                  <PerformanceTh>Invite code</PerformanceTh>
                  <PerformanceTh>Reg. bonus</PerformanceTh>
                  <PerformanceTh>Registrations</PerformanceTh>
                  <PerformanceTh>Today deposit</PerformanceTh>
                  <PerformanceTh>Today release</PerformanceTh>
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

        <Panel
          title="Deposit Bank Placements"
          action={
            canManageBanks ? (
              <button
                className="inline-flex items-center gap-1 text-sm font-semibold text-forest"
                onClick={() => {
                  setEditingBankId("");
                  setShowBankForm(!showBankForm);
                }}
              >
                <Plus size={16} /> Add
              </button>
            ) : null
          }
        >
          {showBankForm && canManageBanks && <BankForm onDone={() => setShowBankForm(false)} />}
          <div className="mt-3 space-y-3">
            {state.banks.length ? (
              state.banks.map((bank) => (
                <div key={bank.id} className="rounded border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold">{bank.bank}</p>
                      <p className="text-sm text-slate-500">{bank.accountName}</p>
                    </div>
                    <span className={`rounded px-2 py-1 text-xs font-bold ${bank.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {bank.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-bold">{bank.accountNumber}</p>
                  <p className="text-xs text-slate-500">Minimum deposit {formatRupiah(bank.minDeposit)}</p>
                  {canManageBanks && (
                    <button
                      className="mt-3 inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setShowBankForm(false);
                        setEditingBankId(editingBankId === bank.id ? "" : bank.id);
                      }}
                    >
                      <Pencil size={13} />
                      Edit bank settings
                    </button>
                  )}
                  {editingBankId === bank.id && canManageBanks && (
                    <div className="mt-3">
                      <BankForm bank={bank} onDone={() => setEditingBankId("")} />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">No bank placements yet. Add one to show deposit instructions on the customer store.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ChartBar({ label, value, percent, tone }: { label: string; value: string; percent: number; tone: "green" | "coral" }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="text-xs font-bold text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone === "green" ? "bg-forest" : "bg-coral"}`} style={{ width: `${Math.max(6, percent)}%` }} />
      </div>
    </div>
  );
}

function DonutRow({ label, value, percent, className }: { label: string; value: number; percent: number; className: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-slate-700">{label}</span>
        <span className="text-xs font-bold text-slate-500">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.max(value ? 6 : 0, percent)}%` }} />
      </div>
    </div>
  );
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
