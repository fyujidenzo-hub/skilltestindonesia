import { useEffect, useMemo, useState } from "react";
import type { Navigate } from "../App";
import AssignmentPanel from "../components/customer/AssignmentPanel";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import CustomerHero from "../components/customer/CustomerHero";
import DepositDestination from "../components/customer/DepositDestination";
import PremiumBanner from "../components/customer/PremiumBanner";
import ProductGrid from "../components/customer/ProductGrid";
import RecentRecords from "../components/customer/RecentRecords";
import StoreShortcutGrid from "../components/customer/StoreShortcutGrid";
import TransactionModal from "../components/customer/TransactionModal";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { createOrder } from "../services/ordersService";
import { useAppStore } from "../store/AppStore";
import type { Product } from "../types";

export default function CustomerPage({ navigate }: { navigate: Navigate }) {
  const { state, dispatch, ready } = useAppStore();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<"topup" | "withdraw" | null>(null);
  const [taskMessage, setTaskMessage] = useState("");
  const [isAcceptingTask, setIsAcceptingTask] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeCustomerId, setActiveCustomerIdState] = useState(() => getActiveCustomerId());

  const currentMember = activeCustomerId ? state.members.find((member) => member.id === activeCustomerId) : undefined;

  useEffect(() => {
    const storedCustomerId = getActiveCustomerId();
    setActiveCustomerIdState(storedCustomerId);

    if (ready && storedCustomerId && state.members.length > 0 && !state.members.some((member) => member.id === storedCustomerId)) {
      clearActiveCustomerId();
      setActiveCustomerIdState(null);
    }
  }, [ready, state.members]);

  // Get active order (any non-completed order for this member)
  const activeOrder = currentMember 
    ? state.orders.find((order) => 
        order.member === currentMember.username && 
        !["completed", "diserahkan"].includes(order.status)
      ) 
    : null;

  const assignedProduct = activeOrder ? state.products.find((product) => product.code === activeOrder.productCode) : undefined;

  const notifications = useMemo<CustomerNotification[]>(() => {
    if (!currentMember) return [];

    const orderNotifications = state.orders
      .filter((order) => order.member === currentMember.username && !["completed", "diserahkan"].includes(order.status))
      .slice(0, 3)
      .map((order) => ({
        id: `order-${order.id}`,
        title: `Order ${order.status}`,
        text: `${order.productName || "Pending assignment"} · ${order.referenceNumber ?? order.id}`,
        tone: order.status === "frozen" ? ("danger" as const) : ("info" as const),
      }));

    const transactionNotifications = state.transactions
      .filter((transaction) => transaction.member === currentMember.username)
      .slice(0, 4)
      .map((transaction) => ({
        id: `transaction-${transaction.id}`,
        title:
          transaction.status === "pending"
            ? `${transaction.type === "topup" ? "Top-up" : "Withdrawal"} pending`
            : `${transaction.type === "topup" ? "Top-up" : "Withdrawal"} ${transaction.status}`,
        text: `${transaction.amount.toLocaleString("id-ID")} IDR · ${transaction.createdAt}`,
        tone:
          transaction.status === "approved"
            ? ("success" as const)
            : transaction.status === "rejected"
              ? ("danger" as const)
              : ("warning" as const),
      }));

    return [...orderNotifications, ...transactionNotifications].slice(0, 6);
  }, [currentMember, state.orders, state.transactions]);

  const filteredProducts = useMemo(
    () => state.products.filter((product) => `${product.name} ${product.code} ${product.category}`.toLowerCase().includes(query.toLowerCase())),
    [query, state.products],
  );

  const toggleFavorite = (productId: string) => {
    setFavorites((items) => (items.includes(productId) ? items.filter((id) => id !== productId) : [...items, productId]));
  };

  const handleAcceptTask = async () => {
    if (!currentMember) {
      navigate("/login");
      return;
    }

    setIsAcceptingTask(true);
    try {
      const order = await createOrder({
        memberId: currentMember.id,
        member: currentMember.username,
        admin: currentMember.referredBy,
        value: 0,
        commission: 0,
        requiredBalance: 0,
        status: "waiting_assignment",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      });
      dispatch({ type: "addOrder", payload: order });
      setTaskMessage(`Task accepted! Reference: ${order.referenceNumber}. Waiting for admin to assign products.`);
    } catch (error) {
      console.error("Failed to accept task:", error);
      setTaskMessage("Unable to accept task. Please try again.");
    } finally {
      setIsAcceptingTask(false);
    }
  };

  const handleSubmitOrder = async () => {
    if (!activeOrder || !currentMember) return;

    setIsSubmittingOrder(true);
    try {
      // Update order status to waiting_shipment
      dispatch({
        type: "updateOrder",
        payload: {
          ...activeOrder,
          status: "waiting_shipment",
          submittedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        },
      });
      setTaskMessage("Order submitted successfully! Waiting for shipment confirmation.");
    } catch (error) {
      console.error("Failed to submit order:", error);
      setTaskMessage("Unable to submit order. Please try again.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const requireLogin = (nextAction: () => void) => {
    if (!currentMember) {
      navigate("/login");
      return;
    }
    nextAction();
  };

  const logout = () => {
    clearActiveCustomerId();
    setActiveCustomerIdState(null);
    navigate("/login");
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f5] text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Restoring member session...</div>
      </main>
    );
  }

  // Show empty state if no data
  if (state.members.length === 0) {
    return (
      <main className="min-h-screen bg-[#f4f6f5] pb-24 text-ink flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No Data Available</h1>
          <p className="text-gray-600 mb-6">Please seed Firestore with sample data to continue.</p>
          <button
            onClick={() => navigate("/admin")}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Admin Panel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f5] pb-24 text-ink">
      <CustomerHeader
        query={query}
        activeUsername={currentMember?.username}
        notifications={notifications}
        onQueryChange={setQuery}
        onLogout={logout}
        navigate={navigate}
      />
      <CustomerHero
        balance={currentMember?.balance ?? 0}
        onTopUp={() => requireLogin(() => setActiveModal("topup"))}
        onWithdraw={() => requireLogin(() => setActiveModal("withdraw"))}
      />

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <StoreShortcutGrid navigate={navigate} onTopUp={() => requireLogin(() => setActiveModal("topup"))} onWithdraw={() => requireLogin(() => setActiveModal("withdraw"))} />
        <PremiumBanner />
        {taskMessage && (
          <p className="mt-5 rounded bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
            {taskMessage}
          </p>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <ProductGrid
            products={filteredProducts}
            favorites={favorites}
            onClearSearch={() => setQuery("")}
            onToggleFavorite={toggleFavorite}
            onTakeOrder={() => {}}
          />
          <aside className="space-y-5">
            <AssignmentPanel
              order={activeOrder}
              products={state.products}
              memberBalance={currentMember?.balance ?? 0}
              onAcceptTask={handleAcceptTask}
              onSubmitOrder={handleSubmitOrder}
              onTopUp={() => requireLogin(() => setActiveModal("topup"))}
              isLoading={isAcceptingTask || isSubmittingOrder}
            />
            <DepositDestination banks={state.banks} />
            <RecentRecords transactions={currentMember ? state.transactions.filter((transaction) => transaction.member === currentMember.username) : []} />
          </aside>
        </div>
      </section>

      <BottomNavbar isLoggedIn={Boolean(activeCustomerId)} navigate={navigate} />
      {activeModal && currentMember && (
        <TransactionModal type={activeModal} member={currentMember.username} onClose={() => setActiveModal(null)} />
      )}
    </main>
  );
}
