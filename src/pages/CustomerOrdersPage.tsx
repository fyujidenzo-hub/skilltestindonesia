import { PackageOpen, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { completeWorkflowOrder, updateOrderStatus } from "../services/ordersService";
import { getOrderCode } from "../services/orderCode";
import { getOrderState } from "../services/orderStateService";
import { useAppStore } from "../store/AppStore";
import type { Order } from "../types";
import { formatRupiah, shortDate } from "../utils";

type OrderTab = "All" | "Pending" | "Completed";

export default function CustomerOrdersPage({ navigate }: { navigate: Navigate }) {
  const { state, dispatch, ready } = useAppStore();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<OrderTab>("All");
  const [confirmOrder, setConfirmOrder] = useState<Order | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeCustomerId = getActiveCustomerId();
  const currentMember = activeCustomerId ? state.members.find((member) => member.id === activeCustomerId) : undefined;

  const orders = useMemo(() => {
    if (!currentMember) return [];
    return state.orders
      .filter((order) => order.member === currentMember.username)
      .filter((order) => `${getOrderCode(order)} ${order.productName ?? ""} ${order.productCode ?? ""}`.toLowerCase().includes(query.toLowerCase()))
      .filter((order) => {
        const orderState = getOrderState(order);
        const completed = orderState === "diserahkan" || orderState === "rejected";
        if (activeTab === "Pending") return !completed;
        if (activeTab === "Completed") return completed;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt.replace(" ", "T")).getTime() - new Date(a.createdAt.replace(" ", "T")).getTime());
  }, [activeTab, currentMember, query, state.orders]);

  const notifications = useMemo<CustomerNotification[]>(() => {
    if (!currentMember) return [];

    return state.orders
      .filter((order) => order.member === currentMember.username && getOrderState(order) !== "diserahkan")
      .slice(0, 4)
      .map((order) => {
        const orderState = getOrderState(order);
        return {
          id: order.id,
          title: orderState === "rejected" ? "Product request rejected" : orderState === "waiting_assignment" ? "Waiting assignment" : "Order update",
          text: `${getOrderCode(order)} · ${order.productName || "Waiting for delivery"}`,
          tone: orderState === "rejected" ? ("danger" as const) : ("info" as const),
          targetPath: "/orders",
        };
      });
  }, [currentMember, state.orders]);

  const logout = () => {
    clearActiveCustomerId();
    navigate("/login");
  };

  const submitOrder = async () => {
    if (!confirmOrder || !currentMember) return;
    const shortage = Math.max(0, (confirmOrder.requiredBalance ?? confirmOrder.value ?? 0) - currentMember.balance);
    if (shortage > 0) {
      setMessage(`Sorry, your balance is insufficient by ${formatRupiah(shortage)}. Please top up first.`);
      setConfirmOrder(null);
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await completeWorkflowOrder(
        {
          ...confirmOrder,
          submittedAt: confirmOrder.submittedAt || new Date().toISOString().slice(0, 16).replace("T", " "),
        },
        currentMember,
      );
      dispatch({ type: "completeOrderWithMember", payload: result });
      setReviewOrderId(result.order.id);
      setConfirmOrder(null);
      setMessage("Order sent successfully. Required balance was deducted and your commission has been added.");
    } catch (error) {
      console.error("Failed to submit order:", error);
      setMessage(error instanceof Error ? error.message : "Unable to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReview = async () => {
    const targetOrder = state.orders.find((order) => order.id === reviewOrderId);
    if (!targetOrder) return;
    setIsSubmitting(true);
    try {
      const updatedOrder = await updateOrderStatus(targetOrder, targetOrder.status, {
        rating,
        review,
        reviewedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      });
      dispatch({ type: "updateOrder", payload: updatedOrder });
      setReviewOrderId("");
      setRating(5);
      setReview("");
      setMessage("Review submitted.");
    } catch (error) {
      console.error("Failed to save review:", error);
      setMessage("Unable to save review. Check Firestore order rules.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f5] text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Restoring member session...</div>
      </main>
    );
  }

  if (!currentMember) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f6f5] px-4 text-ink">
        <div className="w-full max-w-sm rounded bg-white p-6 text-center shadow-panel">
          <h1 className="text-2xl font-black">Login required</h1>
          <p className="mt-2 text-sm text-slate-500">Please login before viewing your task orders.</p>
          <button className="mt-5 w-full rounded bg-forest px-4 py-3 font-black text-white" onClick={() => navigate("/login")}>
            Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f6f5] pb-24 text-ink">
      <CustomerHeader query={query} activeUsername={currentMember.username} notifications={notifications} onQueryChange={setQuery} onLogout={logout} navigate={navigate} />

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Task Orders</h1>
            <p className="text-sm text-slate-500">Track assigned order tasks and submit completed work.</p>
          </div>
          <button className="rounded bg-forest px-4 py-2 text-sm font-black text-white" onClick={() => navigate("/")}>
            Take Order
          </button>
        </div>

        <div className="rounded bg-white p-4 shadow-panel">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-12 w-full rounded border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-forest"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products or order code"
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded bg-slate-100 p-1 text-sm font-black">
            {(["All", "Pending", "Completed"] as const).map((tab) => (
              <button
                key={tab}
                className={`rounded px-3 py-2 ${activeTab === tab ? "bg-forest text-white shadow-sm" : "text-slate-500"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <p className={`mt-4 rounded px-4 py-3 text-sm font-bold ${message.startsWith("Sorry") || message.startsWith("Unable") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {message}
          </p>
        )}

        <div className="mt-5 grid gap-4">
          {orders.length ? (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                products={state.products}
                showReview={reviewOrderId === order.id}
                rating={rating}
                review={review}
                isSubmitting={isSubmitting}
                onOpenConfirm={() => setConfirmOrder(order)}
                onRatingChange={setRating}
                onReviewChange={setReview}
                onSubmitReview={submitReview}
              />
            ))
          ) : (
            <div className="rounded bg-white p-10 text-center shadow-panel">
              <p className="font-black text-slate-700">No orders found</p>
              <p className="mt-1 text-sm text-slate-500">Accepted tasks will appear here after they are created.</p>
            </div>
          )}
        </div>
      </section>

      <BottomNavbar isLoggedIn navigate={navigate} active="orders" />

      {confirmOrder && (
        <ConfirmOrderModal
          order={confirmOrder}
          products={state.products}
          isSubmitting={isSubmitting}
          onCancel={() => setConfirmOrder(null)}
          onConfirm={submitOrder}
        />
      )}
    </main>
  );
}

function OrderCard({
  order,
  products,
  showReview,
  rating,
  review,
  isSubmitting,
  onOpenConfirm,
  onRatingChange,
  onReviewChange,
  onSubmitReview,
}: {
  order: Order;
  products: { id: string; code: string; image: string }[];
  showReview: boolean;
  rating: number;
  review: string;
  isSubmitting: boolean;
  onOpenConfirm: () => void;
  onRatingChange: (rating: number) => void;
  onReviewChange: (review: string) => void;
  onSubmitReview: () => void;
}) {
  const state = getOrderState(order);
  const isCompleted = state === "diserahkan";
  const isRejected = state === "rejected";
  const assignedProducts = order.assignedProducts?.length
    ? order.assignedProducts
    : order.productName
      ? [{ productId: order.productCode ?? "", code: order.productCode ?? "", name: order.productName, quantity: order.quantity ?? 1, price: order.value, commission: order.commission, total: order.value }]
      : [];
  const primaryProduct = assignedProducts[0];
  const primaryImage = products.find((product) => product.id === primaryProduct?.productId || product.code === primaryProduct?.code)?.image;
  const isWaitingAssignment = state === "waiting_assignment" || !primaryProduct;
  const statusBadgeLabel = isCompleted ? "Delivered" : isRejected ? "Rejected" : isWaitingAssignment ? "Not Assigned" : "Not Delivered";
  const waitingText = isWaitingAssignment ? "Waiting for product assignment" : "Waiting for delivery";
  const canSendOrder = Boolean(primaryProduct) && !isCompleted && !isRejected && state !== "belum_diserahkan";

  return (
    <article className="rounded bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs font-bold text-slate-500">Transaction No.:</p>
          <p className="font-black">{getOrderCode(order)}</p>
        </div>
        <span className={`rounded px-2 py-1 text-xs font-black ${isCompleted ? "bg-emerald-100 text-emerald-700" : isRejected ? "bg-rose-100 text-rose-700" : "border border-amber-300 bg-amber-50 text-amber-700"}`}>
          {statusBadgeLabel}
        </span>
      </div>

      {primaryProduct ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[96px_1fr]">
          <img className="h-24 w-24 rounded object-cover" src={primaryImage || "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=240&q=80"} alt={primaryProduct.name} />
          <div>
            <h2 className="font-black">{primaryProduct.name}</h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-slate-500">Order Price</dt>
                <dd className="font-black">{formatRupiah(order.value ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">Commission</dt>
                <dd className="font-black text-coral">{formatRupiah(order.commission ?? 0)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs font-semibold text-slate-500">Created: {shortDate(order.createdAt)}</p>
            {canSendOrder && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button className="rounded bg-forest px-4 py-3 text-sm font-black text-white" onClick={onOpenConfirm}>
                  Send Order
                </button>
                <button className="rounded bg-forest px-4 py-3 text-sm font-black text-white/95">
                  Order Details
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded bg-slate-50 p-8 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-white text-slate-300 shadow-sm">
            <PackageOpen size={30} />
          </div>
          <p className="font-bold text-slate-500">{waitingText}</p>
        </div>
      )}

      {showReview && (
        <div className="mt-5 rounded border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-center gap-1 text-slate-300">
            {[1, 2, 3, 4, 5].map((item) => (
              <button key={item} type="button" className={item <= rating ? "text-forest" : ""} onClick={() => onRatingChange(item)}>
                <Star size={28} fill="currentColor" />
              </button>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-20 w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-forest"
            value={review}
            onChange={(event) => onReviewChange(event.target.value)}
            placeholder="Write your comment or review here..."
          />
          <button className="mt-3 w-full rounded bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:bg-slate-400" disabled={isSubmitting} onClick={onSubmitReview}>
            Send Comment & Rating
          </button>
        </div>
      )}
    </article>
  );
}

function ConfirmOrderModal({ order, products, isSubmitting, onCancel, onConfirm }: { order: Order; products: { id: string; code: string; image: string }[]; isSubmitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  const primaryProduct = order.assignedProducts?.[0];
  const image = products.find((product) => product.id === primaryProduct?.productId || product.code === primaryProduct?.code)?.image;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-panel">
        <h2 className="text-center text-lg font-black">Confirm Order Delivery</h2>
        {primaryProduct && <img className="mx-auto mt-5 h-40 w-40 rounded object-cover" src={image || "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=300&q=80"} alt={primaryProduct.name} />}
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">Are you sure you want to send this order?</p>
        <div className="mt-4 divide-y divide-slate-200 rounded border border-slate-200 text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="font-bold text-slate-500">Order ID</span>
            <span className="font-black">{getOrderCode(order)}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="font-bold text-slate-500">Total</span>
            <span className="font-black">{formatRupiah(0)}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="font-bold text-slate-500">Commission</span>
            <span className="font-black">{formatRupiah(order.commission ?? 0)}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded bg-slate-200 px-4 py-3 font-black text-slate-700" onClick={onCancel}>
            Cancel
          </button>
          <button className="rounded bg-forest px-4 py-3 font-black text-white disabled:bg-slate-400" disabled={isSubmitting} onClick={onConfirm}>
            Yes, Send
          </button>
        </div>
      </div>
    </div>
  );
}
