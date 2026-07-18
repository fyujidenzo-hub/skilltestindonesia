import {
  ArrowLeft,
  Banknote,
  CreditCard,
  ChevronRight,
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
const workAccountBanner = "/assets/work-account-banner.png";
const dailyOrderTarget = 15;

export default function ProfilePage({ navigate }: { navigate: Navigate }) {
  const { state, ready, dispatch } = useAppStore();
  const member = getActiveCustomer(state.members);
  const [settingsMode, setSettingsMode] = useState<"account" | "withdrawal" | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [menuMessage, setMenuMessage] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const memberOrders = useMemo(() => {
    if (!member) return [];
    return state.orders.filter((order) => order.member === member.username);
  }, [member, state.orders]);

  const memberTransactions = useMemo(() => {
    if (!member) return [];
    return state.transactions.filter((transaction) => transaction.member === member.username);
  }, [member, state.transactions]);

  // const frozenBalance = useMemo(() => {
  //   return memberOrders.reduce((total, order) => {
  //     const orderState = getOrderState(order);

  //     const shouldFreeze =
  //       orderState === "product_assigned" ||
  //       orderState === "waiting_shipment" ||
  //       orderState === "belum_diserahkan";

  //     if (!shouldFreeze) return total;

  //     return total + (order.requiredBalance ?? order.value ?? 0);
  //   }, 0);
  // }, [memberOrders]);

  const frozenBalance = 0;

  const workAccountBalance = member ? Number(member.balance ?? 0) : 0;
  const effectiveBalance = workAccountBalance;
  const topUpHistory = memberTransactions.filter((transaction) => transaction.type === "topup");
  const withdrawalHistory = memberTransactions.filter((transaction) => transaction.type === "withdrawal");
  const completedOrderCount = Math.min(member?.totalOrders ?? 0, dailyOrderTarget);
  const completionPercent = Math.min(100, Math.round((completedOrderCount / dailyOrderTarget) * 100));

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg px-4 text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Memulihkan sesi anggota...</div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg px-4 text-ink">
        <section className="w-full max-w-md rounded bg-white p-6 text-center shadow-panel">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mint text-forest">
            <UserRound size={26} />
          </div>
          <h1 className="mt-4 text-2xl font-black">Perlu masuk</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Masuk untuk melihat profil, saldo, dan riwayat pesanan Anda.</p>
          <button className="mt-5 h-11 w-full rounded bg-forest font-bold text-white" onClick={() => navigate("/login")}>
           Lanjut ke halaman masuk
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
      setSettingsMessage(settingsMode === "account" ? "Kata sandi akun telah diperbarui." : "Kata sandi penarikan telah diperbarui.");
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
    {
      label: "Loan",
      description: "Lihat ketersediaan pinjaman saat ini",
      icon: <Banknote size={19} />,
      onClick: () => {
        setMenuMessage("Loan services are not available for this account yet.");
        scrollToSection("loan-info");
      },
    },
    { label: "Withdraw", description: "Create a withdrawal request", icon: <Wallet size={19} />, onClick: () => navigate("/withdraw") },
    { label: "Withdrawal Information", description: "Review withdrawal rules", icon: <FileText size={19} />, onClick: () => scrollToSection("withdrawal-info") },
    { label: "Withdrawal History", description: "Check past withdrawal requests", icon: <History size={19} />, onClick: () => scrollToSection("withdrawal-history") },
    { label: "Top Up History", description: "Check past top-up requests", icon: <CreditCard size={19} />, onClick: () => scrollToSection("topup-history") },
    {
      label: "Password",
      description: "Update account security",
      icon: <KeyRound size={19} />,
      onClick: () => {
        setSettingsMode("account");
        setNewPassword("");
        setSettingsMessage("");
        scrollToSection("settings");
      },
    },
  ];

  return (
    <main className="min-h-screen customer-page-bg pb-24 text-ink">
      <header className="sticky top-0 z-30 border-b border-emerald-100/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <button className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-black text-forest transition hover:bg-mint" onClick={() => navigate("/")}>
            <ArrowLeft size={18} />
            Rumah
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel" onClick={logout}>
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:py-8">
        <div className="mb-5 overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <img
            className="h-32 w-full object-cover sm:h-44 lg:h-52"
            src={workAccountBanner}
            alt="Tokopedia work account promotion"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-700 via-forest to-lime-500 p-5 text-white shadow-[0_24px_70px_rgba(0,128,90,0.22)] sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-lime-200/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-3xl border-4 border-white/40 bg-white shadow-panel sm:h-24 sm:w-24">
                  <img
                    className="h-full w-full object-cover"
                    src={customerLogo}
                    alt="Customer avatar"
                    decoding="async"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">Akun anggota</p>
                  <h1 className="mt-1 break-words text-3xl font-black leading-tight sm:text-4xl">{member.username}</h1>
                  {member.phone && (
                    <p className="mt-2 inline-flex rounded-full bg-emerald-950/25 px-3 py-1 text-sm font-bold text-white/95 ring-1 ring-white/15">
                      Nomor telepon {member.phone}
                    </p>
                  )}
                </div>
              </div>
              {(member.invitationCode || member.referredBy) && (
                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:max-w-xl">
                  {member.invitationCode && <HeroInfo label="Invitation code" value={member.invitationCode} />}
                  {member.referredBy && <HeroInfo label="Referred by" value={member.referredBy} />}
                </div>
              )}
            </div>
            <div className="grid gap-3 rounded-[1.5rem] bg-white/95 p-4 text-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-white/60 lg:min-w-[320px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-500">Saldo Akun Kerja</span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-forest">Aktif</span>
              </div>
              <strong className="block break-words text-3xl font-black sm:text-4xl">{formatRupiah(member.balance)}</strong>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-2xl bg-forest px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700" onClick={() => navigate("/topup")}>
                  Isi Saldo
                </button>
                <button className="rounded-2xl bg-[#ff6f5e] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#f45e4c]" onClick={() => navigate("/withdraw")}>
                  Menarik
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-5">
            <section className="rounded-[1.5rem] border border-white bg-white/95 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-forest">Progres pesanan</p>
                  <h2 className="mt-1 text-xl font-black text-slate-900">{completedOrderCount} dari {dailyOrderTarget} tugas selesai</h2>
                </div>
                <span className="w-fit rounded-full bg-mint px-4 py-2 text-sm font-black text-forest">{completionPercent}% menyelesaikan</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-forest to-lime-400 transition-all" style={{ width: `${completionPercent}%` }} />
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ProfileMetric icon={<WalletCards />} label="Work Account Balance" value={formatRupiah(member.balance)} />
              <ProfileMetric icon={<Wallet />} label="Effective Balance" value={formatRupiah(effectiveBalance)} />
              <ProfileMetric icon={<ShieldCheck />} label="Frozen Balance" value={formatRupiah(frozenBalance)} />
              <ProfileMetric icon={<PackageCheck />} label="Total Orders" value={`${member.totalOrders} / ${dailyOrderTarget}`} />
            </div>

            <Panel title="Account menu">
              {menuMessage && (
                <div className="mb-4 flex items-start justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                  <span>{menuMessage}</span>
                  <button className="text-amber-900" onClick={() => setMenuMessage("")}>
                    Membubarkan
                  </button>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    className="group flex min-h-24 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-forest hover:bg-mint hover:shadow-panel"
                    onClick={item.onClick}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-forest transition group-hover:bg-forest group-hover:text-white">{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-black text-slate-900">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:text-forest" />
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
                  <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">Belum ada riwayat pesanan.</p>
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

            <div id="loan-info">
              <Panel title="Loan">
                <p className="text-sm leading-6 text-slate-600">
                Layanan pinjaman saat ini tidak tersedia untuk akun ini. Jika fitur ini diaktifkan di kemudian hari, rincian pinjaman yang memenuhi syarat akan muncul di sini.
                </p>
              </Panel>
            </div>

            <div id="withdrawal-info">
              <Panel title="Withdrawal Information">
                <p className="text-sm leading-6 text-slate-600">
                  Permintaan penarikan ditinjau oleh administrator. Permintaan yang disetujui akan ditandai dalam riwayat penarikan Anda.
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
                 Ubah kata sandi akun
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
                  Ubah kata sandi penarikan
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
                       Membatalkan
                      </button>
                      <button
                        className="rounded bg-forest px-3 py-2 text-sm font-black text-white disabled:bg-slate-400"
                        disabled={isSavingSettings}
                        onClick={savePassword}
                      >
                        Menyimpan
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
    <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/15 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-wide text-white/70">{label}</p>
      <p className="mt-1 break-words font-black">{value}</p>
    </div>
  );
}

function ProfileMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <article className="group min-h-36 rounded-[1.35rem] border border-white bg-white/95 p-4 shadow-[0_18px_48px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-[0_22px_58px_rgba(0,128,90,0.13)] sm:min-h-40">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-forest transition group-hover:bg-forest group-hover:text-white">{icon}</div>
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
