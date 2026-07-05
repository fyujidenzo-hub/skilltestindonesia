import { ArrowLeft, CheckCircle2, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import TransactionModal from "../components/customer/TransactionModal";
import { clearActiveCustomerId, getActiveCustomer } from "../services/customerSession";
import { getOrderCode } from "../services/orderCode";
import { getOrderState } from "../services/orderStateService";
import { useAppStore } from "../store/AppStore";

export default function CustomerTransactionPage({ navigate, type }: { navigate: Navigate; type: "topup" | "withdraw" }) {
  const { state, ready } = useAppStore();
  const [query, setQuery] = useState("");
  const member = getActiveCustomer(state.members);

  const notifications = useMemo<CustomerNotification[]>(() => {
    if (!member) return [];

    const rejectedOrderNotifications = state.orders
      .filter((order) => order.member === member.username && getOrderState(order) === "rejected")
      .slice(0, 3)
      .map((order) => ({
        id: `order-rejected-${order.id}`,
        title: "Product request rejected",
        text: `${order.productName || "Selected product"} · ${getOrderCode(order)}`,
        tone: "danger" as const,
        targetPath: "/orders",
      }));

    const orderNotifications = state.orders
      .filter((order) => order.member === member.username && !["completed", "diserahkan", "rejected"].includes(order.status))
      .slice(0, 3)
      .map((order) => ({
        id: `order-${order.id}`,
        title: `Order ${order.status}`,
        text: `${order.productName || "Pending assignment"} · ${getOrderCode(order)}`,
        tone: order.status === "frozen" ? ("danger" as const) : ("info" as const),
        targetPath: "/orders",
      }));

    const transactionNotifications = state.transactions
      .filter((transaction) => transaction.member === member.username)
      .slice(0, 4)
      .map((transaction) => ({
        id: `transaction-${transaction.id}`,
        title:
          transaction.status === "pending"
            ? `${transaction.type === "topup" ? "Top Up" : "Withdrawal"} pending`
            : `${transaction.type === "topup" ? "Top Up" : "Withdrawal"} ${transaction.status}`,
        text: `${transaction.amount.toLocaleString("id-ID")} IDR · ${transaction.createdAt}`,
        tone:
          transaction.status === "approved"
            ? ("success" as const)
            : transaction.status === "rejected"
              ? ("danger" as const)
              : ("warning" as const),
        targetPath: transaction.type === "topup" ? "/topup" : "/withdraw",
      }));

    return [...rejectedOrderNotifications, ...orderNotifications, ...transactionNotifications].slice(0, 6);
  }, [member, state.orders, state.transactions]);

  const logout = () => {
    clearActiveCustomerId();
    navigate("/login");
  };

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
        <section className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-panel">
          <h1 className="text-2xl font-black">Login diperlukan</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Silakan masuk sebelum membuat {type === "topup" ? "top up" : "withdrawal"} meminta.</p>
          <button className="mt-5 h-11 w-full rounded-2xl bg-forest font-bold text-white" onClick={() => navigate("/login")}>
           Lanjut ke halaman masuk
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen customer-page-bg pb-24 text-ink">
      <CustomerHeader
        query={query}
        activeUsername={member.username}
        notifications={notifications}
        onQueryChange={setQuery}
        onLogout={logout}
        navigate={navigate}
      />

      <section className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <button className="mb-4 inline-flex items-center gap-2 text-sm font-black text-forest hover:underline" onClick={() => navigate("/profile")}>
          <ArrowLeft size={17} /> Kembali ke profil
        </button>

        {type === "withdraw" ? <WithdrawalNotice /> : <TopUpNotice />}

        <div className="mt-5">
          <TransactionModal
            type={type}
            member={member.username}
            admin={member.referredBy}
            banks={state.banks}
            onClose={() => navigate("/profile")}
            variant="page"
          />
        </div>
      </section>

      <BottomNavbar isLoggedIn navigate={navigate} active="profile" />
    </main>
  );
}

function WithdrawalNotice() {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-forest via-emerald-700 to-emerald-500 p-5 text-white shadow-[0_20px_50px_rgba(16,185,129,0.28)] sm:p-7">
      <div className="grid gap-5 sm:grid-cols-[84px_1fr] sm:items-start">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-forest shadow-sm">
          <Wallet size={38} />
        </div>

        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide sm:text-3xl">Informasi Penting</h1>
          <div className="mt-5 grid gap-4 text-sm font-bold leading-6 text-emerald-50 sm:text-base">
            <NoticeItem text="Gunakan hanya rekening atas nama Anda sendiri untuk pengajuan withdrawal." />
            <NoticeItem text="Pastikan nama bank, nama pemilik rekening, dan nomor rekening sudah benar." />
            <NoticeItem text="The withdrawal amount is deducted immediately and will be refunded if Super Admin rejects the request." />
          </div>

          <div className="mt-5 border-t border-white/25 pt-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-forest">
                <ShieldCheck size={22} />
              </span>
              <p className="text-sm font-bold leading-6 text-white/90">Terima kasih atas perhatian dan kerja sama Anda.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopUpNotice() {
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-forest via-emerald-700 to-emerald-500 p-5 text-white shadow-[0_20px_50px_rgba(16,185,129,0.28)] sm:p-7">
      <div className="grid gap-5 sm:grid-cols-[84px_1fr] sm:items-start">
        <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white text-forest shadow-sm">
          <CreditCard size={38} />
        </div>

        <div>
          <h1 className="text-2xl font-black uppercase tracking-wide sm:text-3xl">Informasi Penting</h1>
          <div className="mt-5 grid gap-4 text-sm font-bold leading-6 text-emerald-50 sm:text-base">
            <NoticeItem text="Gunakan hanya rekening resmi yang tercantum pada formulir ini." />
            <NoticeItem text="Transfer ke rekening selain yang tertera dianggap tidak valid." />
            <NoticeItem text="Pastikan nomor rekening tujuan sudah benar sebelum melakukan pembayaran." />
          </div>

          <div className="mt-5 border-t border-white/25 pt-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-forest">
                <ShieldCheck size={22} />
              </span>
              <p className="text-sm font-bold leading-6 text-white/90">Terima kasih atas perhatian dan kerja sama Anda.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoticeItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-forest">
        <CheckCircle2 size={16} />
      </span>
      <p>{text}</p>
    </div>
  );
}
