import { Send } from "lucide-react";
import { useMemo } from "react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { getOrderCode } from "../services/orderCode";
import { getOrderState } from "../services/orderStateService";
import { useAppStore } from "../store/AppStore";

export default function CustomerServicePage({ navigate }: { navigate: Navigate }) {
  const { state } = useAppStore();
  const activeCustomerId = getActiveCustomerId();
  const currentMember = activeCustomerId
    ? state.members.find((member) => member.id === activeCustomerId)
    : undefined;
  const telegramUrl = state.account.customerServiceTelegramUrl?.trim();

  const notifications = useMemo<CustomerNotification[]>(() => {
    if (!currentMember) return [];

    const rejectedOrderNotifications = state.orders
      .filter(
        (order) =>
          order.member === currentMember.username &&
          getOrderState(order) === "rejected"
      )
      .slice(0, 3)
      .map((order) => ({
        id: `order-rejected-${order.id}`,
        title: "Product request rejected",
        text: `${order.productName || "Selected product"} · ${getOrderCode(order)}`,
        tone: "danger" as const,
        targetPath: "/orders",
      }));

    const orderNotifications = state.orders
      .filter(
        (order) =>
          order.member === currentMember.username &&
          !["completed", "diserahkan", "rejected"].includes(order.status)
      )
      .slice(0, 3)
      .map((order) => ({
        id: `order-${order.id}`,
        title: `Order ${order.status}`,
        text: `${order.productName || "Pending assignment"} · ${getOrderCode(order)}`,
        tone: order.status === "frozen" ? ("danger" as const) : ("info" as const),
        targetPath: "/orders",
      }));

    const transactionNotifications = state.transactions
      .filter((transaction) => transaction.member === currentMember.username)
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

    return [
      ...rejectedOrderNotifications,
      ...orderNotifications,
      ...transactionNotifications,
    ].slice(0, 6);
  }, [currentMember, state.orders, state.transactions]);

  return (
    <main className="min-h-screen customer-page-bg pb-24 text-ink">
      <CustomerHeader
        query=""
        activeUsername={currentMember?.username}
        notifications={notifications}
        onQueryChange={() => undefined}
        onLogout={() => {
          clearActiveCustomerId();
          navigate("/login");
        }}
        navigate={navigate}
      />

      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <button
          className="mb-5 text-sm font-bold text-forest hover:underline"
          onClick={() => navigate("/")}
        >
          Home
        </button>

        <div className="rounded bg-white p-5 shadow-panel sm:p-7">
          <div className="rounded bg-forest p-5 text-white">
            <h1 className="text-xl font-black sm:text-2xl">
              Layanan Pelanggan yang Berdedikasi
            </h1>
            <p className="mt-4 text-sm leading-7 text-emerald-50">
              Pemberitahuan bagi seluruh pengguna: waktu penyelesaian tugas/pesanan adalah 2 jam.
              Harap selesaikan pesanan dalam batas waktu yang ditentukan. Jika Anda melampaui
              batas waktu tersebut, saldo akun Anda dapat dibekukan. Pengisian saldo (top-up) dan
              penarikan dana di luar jam  09:00-21:00 WIB memerlukan persetujuan dari
              tim Layanan Pelanggan kami. Jika terjadi masalah pada transaksi Anda,
              silakan segera hubungi Layanan Pelanggan.
            </p>
          </div>

          <div className="mt-6 rounded bg-white p-6 text-center shadow-panel ring-1 ring-slate-100">
            <a
              className={`mx-auto grid h-20 w-20 place-items-center rounded-full bg-sky-50 text-sky-500 transition ${
                telegramUrl ? "hover:bg-sky-100 hover:text-sky-600" : "pointer-events-none text-slate-300"
              }`}
              href={telegramUrl || undefined}
              target="_blank"
              rel="noreferrer"
              aria-label="Buka layanan pelanggan Telegram"
            >
              <Send size={34} />
            </a>
            <p className="mt-4 text-base font-black text-slate-800">
             Pelayanan pelanggan
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              09:00 AM - 21:00 PM
            </p>
            <a
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded bg-sky-500 px-4 py-3 text-sm font-black text-white shadow-sm transition sm:w-auto ${
                telegramUrl ? "hover:bg-sky-600" : "pointer-events-none bg-slate-300"
              }`}
              href={telegramUrl || undefined}
              target="_blank"
              rel="noreferrer"
            >
              <Send size={17} />
              Obrolan Layanan Pelanggan
            </a>
          </div>
        </div>
      </section>

      <BottomNavbar
        isLoggedIn={Boolean(activeCustomerId)}
        navigate={navigate}
        active="service"
      />
    </main>
  );
}
