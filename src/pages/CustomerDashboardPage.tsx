import { AlertCircle, Banknote, CheckCircle2, ClipboardList, Coins, LogIn, ShoppingBag, Star, WalletCards, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { createOrder } from "../services/ordersService";
import { getOrderCode } from "../services/orderCode";
import { getOrderState } from "../services/orderStateService";
import { useAppStore } from "../store/AppStore";
import { formatRupiah } from "../utils";

const workAccountBanner = "/assets/work-account-banner.png";
const customerLogo = "/assets/customer-logo.jpeg";
const dailyOrderTarget = 15;

export default function CustomerDashboardPage({ navigate }: { navigate: Navigate }) {
  const { state, ready, dispatch } = useAppStore();
  const [query, setQuery] = useState("");
  const [activeCustomerId, setActiveCustomerIdState] = useState(() => getActiveCustomerId());
  const [isAcceptingTask, setIsAcceptingTask] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const currentMember = activeCustomerId ? state.members.find((member) => member.id === activeCustomerId) : undefined;
  const memberOrders = useMemo(() => {
    if (!currentMember) return [];
    return state.orders.filter((order) => order.member === currentMember.username);
  }, [currentMember, state.orders]);

  const completedOrders = memberOrders.filter((order) => ["completed", "diserahkan"].includes(order.status));
  const completionPercent = Math.min(100, Math.round((completedOrders.length / dailyOrderTarget) * 100));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCommission = memberOrders
    .filter((order) => ["completed", "diserahkan"].includes(order.status) && order.createdAt.startsWith(todayKey))
    .reduce((sum, order) => sum + order.commission, 0);

  useEffect(() => {
    const storedCustomerId = getActiveCustomerId();
    setActiveCustomerIdState(storedCustomerId);

    if (ready && storedCustomerId && state.members.length > 0 && !state.members.some((member) => member.id === storedCustomerId)) {
      clearActiveCustomerId();
      setActiveCustomerIdState(null);
    }
  }, [ready, state.members]);

  const notifications = useMemo<CustomerNotification[]>(() => {
    if (!currentMember) return [];

    const rejectedOrderNotifications = state.orders
      .filter((order) => order.member === currentMember.username && getOrderState(order) === "rejected")
      .slice(0, 3)
      .map((order) => ({
        id: `order-rejected-${order.id}`,
        title: "Product request rejected",
        text: `${order.productName || "Selected product"} · ${getOrderCode(order)}`,
        tone: "danger" as const,
        targetPath: "/orders",
      }));

    const orderNotifications = state.orders
      .filter((order) => order.member === currentMember.username && !["completed", "diserahkan", "rejected"].includes(order.status))
      .slice(0, 3)
      .map((order) => ({
        id: `order-${order.id}`,
        title: `Order ${order.status}`,
        text: `${order.productName || "Pending assignment"} · ${getOrderCode(order)}`,
        tone: "info" as const,
        targetPath: "/orders",
      }));

    const transactionNotifications = state.transactions
      .filter((transaction) => transaction.member === currentMember.username)
      .slice(0, 3)
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
      }));

    return [...rejectedOrderNotifications, ...orderNotifications, ...transactionNotifications].slice(0, 6);
  }, [currentMember, state.orders, state.transactions]);

  const handleAcceptTask = async () => {
    if (!currentMember) return;

    // Check if account has zero balance (new account without sign-up bonus)
    if (currentMember.balance === 0) {
      setAlertMessage("You need an admin sign-up bonus to accept tasks. Contact your referrer.");
      return;
    }

    const activeOrder = memberOrders.find((order) => !["completed", "diserahkan", "rejected"].includes(order.status));
    if (activeOrder) {
      setAlertMessage("You already accepted a task. Please complete it before taking another one.");
      return;
    }

    setIsAcceptingTask(true);
    try {
      const order = await createOrder({
        memberId: currentMember.id,
        member: currentMember.username,
        admin: currentMember.referredBy,
        productCode: "",
        productName: "",
        quantity: 0,
        assignedProducts: [],
        value: 0,
        commission: 0,
        requiredBalance: 0,
        status: "waiting_assignment",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      });
      dispatch({ type: "addOrder", payload: order });
      navigate("/take-order");
    } catch (error) {
      console.error("Failed to accept task:", error);
    } finally {
      setIsAcceptingTask(false);
    }
  };

  const logout = () => {
    clearActiveCustomerId();
    setActiveCustomerIdState(null);
    navigate("/login");
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg text-ink">
        <div className="rounded-2xl bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Restoring member session...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen customer-page-bg pb-28 text-ink">
      <CustomerHeader
        query={query}
        activeUsername={currentMember?.username}
        notifications={notifications}
        onQueryChange={setQuery}
        onLogout={logout}
        navigate={navigate}
      />

      {alertMessage && (
        <div className="fixed inset-x-0 top-20 z-50 mx-auto w-[calc(100%-2rem)] max-w-md">
          <div className="rounded bg-white p-4 shadow-panel ring-1 ring-amber-100">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-amber-50 text-amber-600">
                <AlertCircle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900">{alertMessage}</p>
              </div>
              <button className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-slate-100" onClick={() => setAlertMessage("")} aria-label="Close alert">
                <X size={17} />
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-emerald-100/70">
          <img className="h-36 w-full object-cover sm:h-48" src={workAccountBanner} alt="Tokopedia work account promotion" />

          <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
            <section className="rounded-[1.5rem] bg-[linear-gradient(145deg,#62b650_0%,#168d62_100%)] p-5 text-white shadow-[0_16px_42px_rgba(22,141,98,0.18)]">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white/92 text-forest shadow-sm">
                <ClipboardList size={38} />
              </div>
              <h1 className="mt-4 text-center text-3xl font-black">Classic</h1>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/45">
                <div className="h-full rounded-full bg-white" style={{ width: `${completionPercent}%` }} />
              </div>
              <p className="mt-4 text-center text-sm font-semibold text-white/90">Tasks completed</p>
              <p className="text-center text-4xl font-black">{completedOrders.length}</p>
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-forest">
                Complete your first task <Star className="ml-1 inline" size={16} fill="currentColor" />
              </div>
            </section>

            <section className="rounded-[1.5rem] bg-white p-5 text-center shadow-[0_16px_42px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-mint text-forest">
                <ShoppingBag size={38} />
              </div>
              <p className="mt-7 text-5xl font-black text-forest">{completionPercent}%</p>
              <p className="mt-2 text-lg font-black text-slate-800">Total task target</p>
              <p className="text-3xl font-black">{dailyOrderTarget}</p>
              <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-forest">
                You can do this! <CheckCircle2 className="ml-1 inline" size={16} />
              </div>
            </section>
          </div>

          <section className="mx-4 mb-4 rounded-[1.5rem] bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:mx-5 sm:mb-5">
            <DashboardMetric
              icon={<Coins size={22} />}
              label="Daily commission"
              description="Commission released after completed task orders"
              value={formatRupiah(todayCommission)}
            />
            <div className="my-4 h-px bg-slate-100" />
            <DashboardMetric
              icon={<WalletCards size={22} />}
              label="Work account balance"
              description="Balance increases after completed order tasks"
              value={formatRupiah(currentMember?.balance ?? 0)}
            />
            <button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-forest px-5 py-4 text-base font-black text-white shadow-[0_16px_34px_rgba(22,141,98,0.22)] hover:-translate-y-0.5 hover:bg-emerald-700 disabled:bg-slate-400 disabled:hover:bg-slate-400"
              onClick={() => {
                if (currentMember) {
                  handleAcceptTask();
                } else {
                  navigate("/login");
                }
              }}
              disabled={isAcceptingTask || (currentMember?.balance === 0)}
            >
              {currentMember ? <Banknote size={20} /> : <LogIn size={20} />}
              {isAcceptingTask ? "Accepting..." : currentMember?.balance === 0 ? "Need Sign-up Bonus or Top Up" : currentMember ? "Take Order" : "Login to Take Order"}
            </button>
          </section>

          <section className="mx-4 mb-5 overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-emerald-50 to-lime-50 p-4 ring-1 ring-emerald-100 sm:mx-5">
            <div className="flex items-center gap-4">
              <img className="h-16 w-16 rounded-2xl object-cover ring-1 ring-emerald-100" src={customerLogo} alt="Tokopedia work account mascot" />
              <div>
                <p className="text-lg font-black text-forest">Keep going</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">Finish all assigned tasks and keep your work account active every day.</p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <BottomNavbar isLoggedIn={Boolean(activeCustomerId)} navigate={navigate} active="claim" />
    </main>
  );
}

function DashboardMetric({ icon, label, description, value }: { icon: React.ReactNode; label: string; description: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint text-forest">{icon}</span>
        <span className="min-w-0">
          <span className="block text-lg font-black text-slate-900">{label}</span>
          <span className="mt-0.5 block text-sm leading-5 text-slate-500">{description}</span>
        </span>
      </div>
      <span className="shrink-0 text-right text-xl font-black text-forest">{value}</span>
    </div>
  );
}
