import {
  ArrowLeft,
  Banknote,
  CreditCard,
  FileText,
  History,
  KeyRound,
  LogOut,
  PackageCheck,
  ShieldCheck,
  UserRound,
  Wallet,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Navigate } from "../App";
import { Panel } from "../components/common";
import BottomNavbar from "../components/customer/BottomNavbar";
import { clearActiveCustomerId, getActiveCustomer } from "../services/customerSession";
import { getOrderState } from "../services/orderStateService";
import { updateMember } from "../services/membersService";
import { useAppStore } from "../store/AppStore";
import { formatRupiah, shortDate } from "../utils";

const customerLogo = "/assets/customer-logo.jpeg";
const dailyOrderTarget = 15;

export default function ProfilePage({ navigate }: { navigate: Navigate }) {
  const { state, ready, dispatch } = useAppStore();
  const member = getActiveCustomer(state.members);
  const [settingsMode, setSettingsMode] = useState<"account" | "withdrawal" | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const memberOrders = useMemo(() => {
    if (!member) return [];
    return state.orders.filter((order) => order.member === member.username);
  }, [member, state.orders]);

  const memberTransactions = useMemo(() => {
    if (!member) return [];
    return state.transactions.filter((transaction) => transaction.member === member.username);
  }, [member, state.transactions]);

  const frozenBalance = useMemo(() => {
    return memberOrders.reduce((total, order) => {
      const orderState = getOrderState(order);
      if (orderState === "diserahkan") return total;
      return total + (order.requiredBalance ?? order.value ?? 0);
    }, 0);
  }, [memberOrders]);

  const effectiveBalance = member ? Math.max(0, member.balance - frozenBalance) : 0;
  const topUpHistory = memberTransactions.filter((transaction) => transaction.type === "topup");
  const withdrawalHistory = memberTransactions.filter((transaction) => transaction.type === "withdrawal");

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-mint px-4 text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Restoring member session...</div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="grid min-h-screen place-items-center bg-mint px-4 text-ink">
        <section className="w-full max-w-md rounded bg-white p-6 text-center shadow-panel">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-forest">
            <UserRound size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-black">Login required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to view your profile, balance, and order history.</p>
          <button className="mt-5 h-11 w-full rounded bg-forest font-bold text-white" onClick={() => navigate("/login")}>
            Go to login
          </button>
        </section>
      </main>
    );
  }

  const logout = () => {
    clearActiveCustomerId();
    navigate("/login");
  };

  const savePassword = async () => {
    if (!settingsMode || !newPassword.trim()) {
      setSettingsMessage("Enter a new password first.");
      return;
    }

    setIsSavingSettings(true);
    setSettingsMessage("Saving...");
    try {
      const updatedMember = {
        ...member,
        ...(settingsMode === "account" ? { accountPassword: newPassword.trim() } : { withdrawalPassword: newPassword.trim() }),
      };
      await updateMember(member.id, settingsMode === "account" ? { accountPassword: newPassword.trim() } : { withdrawalPassword: newPassword.trim() });
      dispatch({ type: "updateMember", payload: updatedMember });
      setSettingsMessage(settingsMode === "account" ? "Account password updated." : "Withdrawal password updated.");
      setSettingsMode(null);
      setNewPassword("");
    } catch (error) {
      console.error("Failed to update member password:", error);
      setSettingsMessage("Unable to save. Check Firestore member rules.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const menuItems = [
    { label: "Loan", icon: <Banknote size={18} />, onClick: () => undefined },
    { label: "Withdraw", icon: <Wallet size={18} />, onClick: () => navigate("/withdraw") },
    { label: "Withdrawal Information", icon: <FileText size={18} />, onClick: () => scrollToSection("withdrawal-info") },
    { label: "Withdrawal History", icon: <History size={18} />, onClick: () => scrollToSection("withdrawal-history") },
    { label: "Top Up History", icon: <CreditCard size={18} />, onClick: () => scrollToSection("topup-history") },
    { label: "Password", icon: <KeyRound size={18} />, onClick: () => scrollToSection("settings") },
  ];

  return (
    <main className="min-h-screen bg-[#f4f6f5] pb-24 text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <button className="inline-flex items-center gap-2 text-sm font-bold text-forest" onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
            Back to store
          </button>
          <button className="inline-flex items-center gap-2 rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white" onClick={logout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="overflow-hidden rounded bg-gradient-to-br from-emerald-600 via-forest to-lime-500 p-5 text-white shadow-panel sm:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded border-4 border-white/35 bg-white shadow-panel sm:h-24 sm:w-24">
                  <img className="h-full w-full object-cover" src={customerLogo} alt="Customer avatar" />
                </div>
                <div className="min-w-0">
                  <h1 className="break-words text-3xl font-black sm:text-4xl">{member.username}</h1>
                  {member.phone && (
                    <p className="mt-2 inline-flex rounded bg-emerald-900/25 px-3 py-1 text-sm font-bold text-white/95">
                      Phone number {member.phone}
                    </p>
                  )}
                </div>
              </div>
              {(member.invitationCode || member.referredBy) && (
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  {member.invitationCode && <HeroInfo label="Invitation code" value={member.invitationCode} />}
                  {member.referredBy && <HeroInfo label="Referred by" value={member.referredBy} />}
                </div>
              )}
            </div>
            <div className="rounded bg-white/15 p-4 md:min-w-64 md:text-right">
              <span className="text-sm font-semibold text-white/80">Work Account Balance</span>
              <strong className="mt-1 block text-3xl font-black">{formatRupiah(member.balance)}</strong>
              <button className="mt-4 w-full rounded bg-white px-4 py-3 text-sm font-black text-forest hover:bg-mint md:w-auto" onClick={() => navigate("/topup")}>
                Top Up
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ProfileMetric icon={<WalletCards />} label="Work Account Balance" value={formatRupiah(member.balance)} />
              <ProfileMetric icon={<Wallet />} label="Effective Balance" value={formatRupiah(effectiveBalance)} />
              <ProfileMetric icon={<ShieldCheck />} label="Frozen Balance" value={formatRupiah(frozenBalance)} />
              <ProfileMetric icon={<PackageCheck />} label="Total Orders" value={`${member.totalOrders} / ${dailyOrderTarget}`} />
            </div>

            <Panel title="Account menu">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {menuItems.map((item) => (
                  <button key={item.label} className="flex items-center gap-3 rounded border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black text-slate-700 transition hover:border-forest hover:bg-mint" onClick={item.onClick}>
                    <span className="grid h-10 w-10 place-items-center rounded bg-mint text-forest">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="Order history">
              <div className="space-y-3">
                {memberOrders.length ? (
                  memberOrders.map((order) => (
                    <div key={order.id} className="rounded border border-slate-200 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-bold">{order.productName || "Waiting for product assignment"}</p>
                          <p className="text-xs text-slate-500">
                            {order.productCode || "No product code"} - {shortDate(order.createdAt)}
                          </p>
                        </div>
                        <span className="rounded bg-mint px-2 py-1 text-xs font-bold capitalize text-forest">{order.status.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">No order history yet.</p>
                )}
              </div>
            </Panel>
          </div>

          <aside className="space-y-5">
            <Panel title="Account details">
              <ProfileRow label="Phone" value={member.phone || "-"} />
              <ProfileRow label="Invitation code" value={member.invitationCode || "-"} />
              <ProfileRow label="Referred by" value={member.referredBy || "-"} />
              <ProfileRow label="Level" value={displayLevel(member.level)} />
              <ProfileRow label="Last login" value={member.lastLogin || "-"} />
            </Panel>

            <Panel title="Balance summary">
              <ProfileRow label="Work Account Balance" value={formatRupiah(member.balance)} />
              <ProfileRow label="Effective Balance" value={formatRupiah(effectiveBalance)} />
              <ProfileRow label="Frozen Balance" value={formatRupiah(frozenBalance)} />
            </Panel>

            <div id="withdrawal-info">
              <Panel title="Withdrawal Information">
                <p className="text-sm leading-6 text-slate-600">
                  Withdrawal requests are reviewed by the administrator. Approved requests will be marked in your withdrawal history.
                </p>
              </Panel>
            </div>

            <HistoryPanel id="withdrawal-history" title="Withdrawal History" emptyText="No withdrawal history yet." transactions={withdrawalHistory} />
            <HistoryPanel id="topup-history" title="Top Up History" emptyText="No top up history yet." transactions={topUpHistory} />

            <div id="settings">
              <Panel title="Password">
                <button
                  className="flex w-full items-center gap-3 rounded border border-slate-200 px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setSettingsMode("account");
                    setNewPassword("");
                    setSettingsMessage("");
                  }}
                >
                  <KeyRound size={17} className="text-forest" />
                  Change account password
                </button>
                <button
                  className="mt-3 flex w-full items-center gap-3 rounded border border-slate-200 px-3 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setSettingsMode("withdrawal");
                    setNewPassword("");
                    setSettingsMessage("");
                  }}
                >
                  <CreditCard size={17} className="text-forest" />
                  Change withdrawal password
                </button>
                {settingsMode && (
                  <div className="mt-4 rounded bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-800">
                      {settingsMode === "account" ? "New account password" : "New withdrawal password"}
                    </p>
                    <input
                      className="mt-2 h-11 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:border-forest"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter new password"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="rounded border border-slate-200 px-3 py-2 text-sm font-black text-slate-600 hover:bg-white"
                        onClick={() => {
                          setSettingsMode(null);
                          setNewPassword("");
                          setSettingsMessage("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded bg-forest px-3 py-2 text-sm font-black text-white disabled:bg-slate-400"
                        disabled={isSavingSettings}
                        onClick={savePassword}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
                {settingsMessage && (
                  <p className={`mt-3 rounded px-3 py-2 text-sm font-bold ${settingsMessage.includes("Unable") || settingsMessage.includes("Enter") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {settingsMessage}
                  </p>
                )}
              </Panel>
            </div>
          </aside>
        </div>
      </section>
      <BottomNavbar isLoggedIn navigate={navigate} active="profile" />
    </main>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function HeroInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/15 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-1 break-words font-black">{value}</p>
    </div>
  );
}

function ProfileMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="rounded bg-white p-4 shadow-panel">
      <div className="grid h-10 w-10 place-items-center rounded bg-mint text-forest">{icon}</div>
      <p className="mt-4 text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-lg font-black">{value}</p>
    </article>
  );
}

function displayLevel(level: string) {
  if (level === "VIP") return "VIP 1";
  return level;
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold">{value}</p>
    </div>
  );
}

function HistoryPanel({
  id,
  title,
  emptyText,
  transactions,
}: {
  id: string;
  title: string;
  emptyText: string;
  transactions: Array<{ id: string; amount: number; status: string; createdAt: string }>;
}) {
  return (
    <div id={id}>
      <Panel title={title}>
        <div className="space-y-2">
          {transactions.length ? (
            transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 p-3 text-sm">
                <div>
                  <p className="font-black">{formatRupiah(transaction.amount)}</p>
                  <p className="text-xs text-slate-500">{shortDate(transaction.createdAt)}</p>
                </div>
                <span className="rounded bg-white px-2 py-1 text-xs font-black capitalize text-slate-600">{transaction.status}</span>
              </div>
            ))
          ) : (
            <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">{emptyText}</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
