import { PackageOpen, Search, Star } from "lucide-react";
import AssignmentPanel from "../components/customer/AssignmentPanel";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { completeWorkflowOrder, getOrdersByMember, submitWorkflowOrder, subscribeToOrdersByMember, updateOrderStatus } from "../services/ordersService";
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
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [reviewOrderId, setReviewOrderId] = useState("");
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasTrackedAssignmentsRef = useRef(false);
  const lastAssignedOrderIdsRef = useRef<Set<string>>(new Set());

  const activeCustomerId = getActiveCustomerId();
  const currentMember = activeCustomerId ? state.members.find((member) => member.id === activeCustomerId) : undefined;

  const activeOrder = useMemo(() => {
    if (!currentMember) return null;

    return (
      state.orders.find(
        (order) =>
          order.member === currentMember.username &&
          !["completed", "diserahkan", "rejected"].includes(order.status)
      ) ?? null
    );
  }, [currentMember, state.orders]);

  const shouldShowAssignmentPanel = Boolean(activeOrder) && activeTab !== "Completed";

  useEffect(() => {
    if (!currentMember?.username) return;

    const memberUsername = currentMember.username;
    let cancelled = false;
    let realtimeActive = false;
    let pollTimer: ReturnType<typeof window.setInterval> | null = null;

    const syncOrders = (nextOrders: Order[]) => {
      if (cancelled) return;
      dispatch({ type: "replaceMemberOrders", payload: { member: memberUsername, orders: nextOrders } });
    };

    const pollOrders = async () => {
      try {
        syncOrders(await getOrdersByMember(memberUsername));
      } catch (error) {
        console.warn("Unable to refresh task orders:", error);
      }
    };

    const stopRealtime = subscribeToOrdersByMember(
      memberUsername,
      (nextOrders) => {
        realtimeActive = true;
        syncOrders(nextOrders);
      },
      (error) => {
        console.warn("Realtime task order listener failed; using 10-second polling.", error);
        if (!pollTimer) {
          pollOrders();
          pollTimer = window.setInterval(pollOrders, 10000);
        }
      },
    );

    const fallbackTimer = window.setTimeout(() => {
      if (!realtimeActive && !pollTimer) {
        pollOrders();
        pollTimer = window.setInterval(pollOrders, 10000);
      }
    }, 10000);

    return () => {
      cancelled = true;
      stopRealtime();
      window.clearTimeout(fallbackTimer);
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [currentMember?.username, dispatch]);

  useEffect(() => {
    if (!currentMember) return;

    const assignedOrders = state.orders.filter((order) => {
      const orderState = getOrderState(order);
      return order.member === currentMember.username && (orderState === "product_assigned" || orderState === "waiting_shipment");
    });

    const previousAssignedOrderIds = lastAssignedOrderIdsRef.current;
    const newAssignedOrder = assignedOrders.find((order) => !previousAssignedOrderIds.has(order.id));
    lastAssignedOrderIdsRef.current = new Set(assignedOrders.map((order) => order.id));

    if (!hasTrackedAssignmentsRef.current) {
      hasTrackedAssignmentsRef.current = true;
      return;
    }

    if (newAssignedOrder) {
      setMessage(`Produk tugas baru telah ditetapkan: ${newAssignedOrder.productName || getOrderCode(newAssignedOrder)}.`);
    }
  }, [currentMember, state.orders]);

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

  const displayOrders =
    shouldShowAssignmentPanel && activeOrder
      ? orders.filter((order) => order.id !== activeOrder.id)
      : orders;

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
    .filter((order) => {
      const orderState = getOrderState(order);

      return (
        order.member === currentMember.username &&
        orderState !== "diserahkan" &&
        orderState !== "rejected"
      );
    })
    .slice(0, 3)
    .map((order) => {
      const orderState = getOrderState(order);

      return {
        id: `order-${order.id}`,
        title:
          orderState === "waiting_assignment"
            ? "Menunggu penugasan"
            : orderState === "product_assigned"
              ? "Produk telah ditetapkan"
              : orderState === "waiting_shipment"
                ? "Menunggu pengiriman"
                : orderState === "belum_diserahkan"
                  ? "Menunggu pengiriman"
                  : "Pembaruan pesanan",
        text: `${getOrderCode(order)} · ${order.productName || "Waiting for delivery"}`,
        tone: order.status === "frozen" ? ("danger" as const) : ("info" as const),
        targetPath: "/orders",
      };
    });

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


  const logout = () => {
    clearActiveCustomerId();
    navigate("/login");
  };
const handleStartShipment = async () => {
  if (!activeOrder) return;
  if (activeOrder.status === "waiting_shipment") return;

  setIsSubmitting(true);
  try {
    const order = await updateOrderStatus(activeOrder, "waiting_shipment", {
      submittedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    });

    dispatch({ type: "updateOrder", payload: order });
  } catch (error) {
    console.error("Failed to prepare shipment:", error);
    setMessage("Tidak dapat menyiapkan pengiriman. Silakan coba lagi.");
  } finally {
    setIsSubmitting(false);
  }
};

const handleSubmitAssignmentOrder = async () => {
  if (!activeOrder || !currentMember) return;

  setIsSubmitting(true);
  setMessage("");

  try {
    const result = await submitWorkflowOrder(
      {
        ...activeOrder,
        submittedAt:
          activeOrder.submittedAt ??
          new Date().toISOString().slice(0, 16).replace("T", " "),
      },
      currentMember
    );

    dispatch({ type: "completeOrderWithMember", payload: result });
    setMessage("Pesanan berhasil dikirimkan. Saldo Anda tidak dipotong. Komisi akan ditambahkan setelah penyelesaian.");
  } catch (error) {
    console.error("Failed to submit order:", error);
    setMessage(error instanceof Error ? error.message : "Unable to submit order. Please try again.");
  } finally {
    setIsSubmitting(false);
  }
};

const handleConfirmDelivery = async () => {
  if (!activeOrder || !currentMember) return;

  setIsSubmitting(true);
  setMessage("");

  try {
    const result = await completeWorkflowOrder(activeOrder, currentMember);
    dispatch({ type: "completeOrderWithMember", payload: result });
    setMessage(`Order completed. Commission ${result.order.commission.toLocaleString("id-ID")} IDR added to your balance.`);
  } catch (error) {
    console.error("Failed to confirm delivery:", error);
    setMessage(error instanceof Error ? error.message : "Unable to confirm delivery.");
  } finally {
    setIsSubmitting(false);
  }
};

const handleAcceptChangedProduct = async () => {
  if (!activeOrder) return;

  setIsSubmitting(true);
  try {
    const order = await updateOrderStatus(activeOrder, "product_assigned", {
      requiresCustomerApproval: false,
    });

    dispatch({ type: "updateOrder", payload: order });
    setMessage("Produk yang diubah telah disetujui. Anda sekarang dapat mengirimkan pesanan tersebut.");
  } catch (error) {
    console.error("Failed to accept changed product:", error);
    setMessage(error instanceof Error ? error.message : "Unable to accept changed product.");
  } finally {
    setIsSubmitting(false);
  }
};

const handleRejectChangedProduct = async () => {
  if (!activeOrder) return;

  setIsSubmitting(true);
  try {
    const order = await updateOrderStatus(activeOrder, "rejected", {
      requiresCustomerApproval: false,
      completedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    });

    dispatch({ type: "updateOrder", payload: order });
    setMessage("Produk yang diubah ditolak. Anda dapat mengambil pesanan lain.");
  } catch (error) {
    console.error("Failed to reject changed product:", error);
    setMessage(error instanceof Error ? error.message : "Unable to reject changed product.");
  } finally {
    setIsSubmitting(false);
  }
};
 const submitOrder = async () => {
  if (!confirmOrder || !currentMember) return;
  setIsSubmitting(true);
  setMessage("");

  try {
    const result = await submitWorkflowOrder(
      {
        ...confirmOrder,
        submittedAt: confirmOrder.submittedAt || new Date().toISOString().slice(0, 16).replace("T", " "),
      },
      currentMember,
    );

    dispatch({ type: "completeOrderWithMember", payload: result });
    setConfirmOrder(null);
    setMessage("Order sent successfully. Waiting for delivery confirmation.");
  } catch (error) {
    console.error("Failed to submit order:", error);
    setMessage(error instanceof Error ? error.message : "Tidak dapat mengirimkan pesanan. Silakan coba lagi..");
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
      setMessage("Tidak dapat menyimpan ulasan. Periksa aturan urutan Firestore.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Memulihkan sesi anggota...</div>
      </main>
    );
  }

  if (!currentMember) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg px-4 text-ink">
        <div className="w-full max-w-sm rounded bg-white p-6 text-center shadow-panel">
          <h1 className="text-2xl font-black">Perlu masuk</h1>
          <p className="mt-2 text-sm text-slate-500">Silakan masuk untuk melihat pesanan tugas Anda.</p>
          <button className="mt-5 w-full rounded bg-forest px-4 py-3 font-black text-white" onClick={() => navigate("/login")}>
            Masuk
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen customer-page-bg pb-24 text-ink">
      <CustomerHeader query={query} activeUsername={currentMember.username} notifications={notifications} onQueryChange={setQuery} onLogout={logout} navigate={navigate} />

      <section className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
          <h1 className="text-2xl font-black">Pesanan Tugas</h1>
            <p className="text-sm text-slate-500">Pantau tugas pesanan yang diberikan dan serahkan pekerjaan yang telah selesai.</p>
          </div>
          {/* <button className="rounded bg-forest px-4 py-2 text-sm font-black text-white" onClick={() => navigate("/")}>
            Take Order
          </button> */}
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

        {shouldShowAssignmentPanel && activeOrder && (
          <div className="mt-5">
            <AssignmentPanel
              order={activeOrder}
              products={state.products}
              memberBalance={currentMember.balance}
              member={currentMember}
              onAcceptTask={() => {
                setMessage("Anda sudah memiliki tugas yang sedang berjalan. Selesaikan tugas tersebut sebelum mengambil tugas lain.");
              }}
              onStartShipment={handleStartShipment}
              onSubmitOrder={handleSubmitAssignmentOrder}
              onConfirmDelivery={handleConfirmDelivery}
              onAcceptChangedProduct={handleAcceptChangedProduct}
              onRejectChangedProduct={handleRejectChangedProduct}
              onTopUp={() => {
                setMessage("Silakan isi ulang saldo Anda dari halaman utama.");
                navigate("/");
              }}
              isLoading={isSubmitting}
            />
          </div>
        )}

        <div className="mt-5 grid gap-4">
          {displayOrders.length ? (
            displayOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                products={state.products}
                showReview={reviewOrderId === order.id}
                rating={rating}
                review={review}
                isSubmitting={isSubmitting}
                onOpenConfirm={() => setConfirmOrder(order)}
                onOpenDetails={() => setDetailOrder(order)}
                onRatingChange={setRating}
                onReviewChange={setReview}
                onSubmitReview={submitReview}
              />
            ))
          ) : !shouldShowAssignmentPanel ? (
            <div className="rounded bg-white p-10 text-center shadow-panel">
              <p className="font-black text-slate-700">Tidak ada pesanan yang ditemukan</p>
              <p className="mt-1 text-sm text-slate-500">
                Tugas yang diterima akan muncul di sini setelah dibuat.
              </p>
            </div>
          ) : null}
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

      {detailOrder && <OrderDetailsModal order={detailOrder} products={state.products} onClose={() => setDetailOrder(null)} />}
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
  onOpenDetails,
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
  onOpenDetails: () => void;
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
                <dt className="text-xs font-bold text-slate-500">Harga Pesanan</dt>
                <dd className="font-black">{formatRupiah(order.value ?? 0)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-slate-500">Komisi</dt>
                <dd className="font-black text-coral">{formatRupiah(order.commission ?? 0)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs font-semibold text-slate-500">Dibuat: {shortDate(order.createdAt)}</p>
            {canSendOrder && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button className="rounded bg-forest px-4 py-3 text-sm font-black text-white" onClick={onOpenConfirm}>
                  Kirim Pesanan
                </button>
                <button className="rounded bg-forest px-4 py-3 text-sm font-black text-white/95" onClick={onOpenDetails}>
                  Rincian Pesanan
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
            placeholder="Tulis komentar atau ulasan Anda di sini..."
          />
          <button className="mt-3 w-full rounded bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:bg-slate-400" disabled={isSubmitting} onClick={onSubmitReview}>
            Kirim Komentar & Penilaian
          </button>
        </div>
      )}
    </article>
  );
}

function OrderDetailsModal({
  order,
  products,
  onClose,
}: {
  order: Order;
  products: { id: string; code: string; image: string }[];
  onClose: () => void;
}) {
  const state = getOrderState(order);
  const assignedProducts = order.assignedProducts?.length
    ? order.assignedProducts
    : order.productName
      ? [{ productId: order.productCode ?? "", code: order.productCode ?? "", name: order.productName, quantity: order.quantity ?? 1, price: order.value, commission: order.commission, total: order.value }]
      : [];
  const primaryProduct = assignedProducts[0];
  const image = products.find((product) => product.id === primaryProduct?.productId || product.code === primaryProduct?.code)?.image;
  const statusLabel = state === "diserahkan" ? "Delivered" : state === "rejected" ? "Rejected" : primaryProduct ? "Not Delivered" : "Not Assigned";
  const requiredBalance = order.requiredBalance ?? order.value ?? 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-[1.5rem] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-forest">Order Details</p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-900">{getOrderCode(order)}</h2>
          </div>
          <button className="rounded-full bg-slate-100 px-3 py-2 text-sm font-black text-slate-600 hover:bg-slate-200" onClick={onClose}>
           Menutup
          </button>
        </div>

        <div className="max-h-[calc(92vh-74px)] overflow-y-auto p-5">
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {primaryProduct ? (
                
                <img
                  className="h-40 w-full rounded-xl object-cover md:h-44"
                  src={image || "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=300&q=80"}
                  alt={primaryProduct.name}
                />
              ) : (
                <div className="grid h-40 place-items-center rounded-xl bg-white text-slate-300 md:h-44">
                  <PackageOpen size={42} />
                </div>
              )}
            </div>

            <div>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${state === "diserahkan" ? "bg-emerald-100 text-emerald-700" : state === "rejected" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                {statusLabel}
              </span>
              <h3 className="mt-3 text-2xl font-black leading-tight text-slate-900">
                {primaryProduct?.name ?? "Waiting for product assignment"}
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Product code: <span className="text-slate-800">{primaryProduct?.code || order.productCode || "-"}</span>
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <DetailStat label="Order Price" value={formatRupiah(order.value ?? 0)} />
                <DetailStat label="Commission" value={formatRupiah(order.commission ?? 0)} accent />
                <DetailStat label="Order Amount" value={formatRupiah(requiredBalance)} />
                <DetailStat label="Created" value={shortDate(order.createdAt)} />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-900">Ringkasan transaksi</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <DetailRow label="Transaction No." value={getOrderCode(order)} />
              <DetailRow label="Current status" value={statusLabel} />
              <DetailRow label="Assigned date" value={order.assignedAt ? shortDate(order.assignedAt) : "-"} />
              <DetailRow label="Completed date" value={order.completedAt ? shortDate(order.completedAt) : "-"} />
              <DetailRow label="Submitted date" value={order.submittedAt ? shortDate(order.submittedAt) : "-"} />
              <DetailRow label="Rating" value={order.rating ? `${order.rating} / 5` : "-"} />
            </div>
            {order.review && (
              <div className="mt-3 rounded-xl bg-white p-3">
                <p className="text-xs font-black uppercase text-slate-500">Ulasan</p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-700">{order.review}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className={`mt-1 break-words text-lg font-black ${accent ? "text-coral" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-2 last:border-0">
      <span className="text-xs font-black uppercase text-slate-500">{label}</span>
      <span className="text-right text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

function ConfirmOrderModal({ order, products, isSubmitting, onCancel, onConfirm }: { order: Order; products: { id: string; code: string; image: string }[]; isSubmitting: boolean; onCancel: () => void; onConfirm: () => void }) {
  const primaryProduct = order.assignedProducts?.[0];
  const image = products.find((product) => product.id === primaryProduct?.productId || product.code === primaryProduct?.code)?.image;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4">
      <div className="w-full max-w-sm rounded bg-white p-5 shadow-panel">
        <h2 className="text-center text-lg font-black">Konfirmasi Pengiriman Pesanan</h2>
        {primaryProduct && <img className="mx-auto mt-5 h-40 w-40 rounded object-cover" src={image || "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=300&q=80"} alt={primaryProduct.name} />}
        <p className="mt-4 text-center text-sm font-semibold text-slate-600">Apakah Anda yakin ingin mengirim pesanan ini?</p>
        <div className="mt-4 divide-y divide-slate-200 rounded border border-slate-200 text-sm">
          <div className="flex justify-between px-4 py-3">
            <span className="font-bold text-slate-500">ID Pesanan</span>
            <span className="font-black">{getOrderCode(order)}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="font-bold text-slate-500">Total</span>
            <span className="font-black">{formatRupiah(0)}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="font-bold text-slate-500">Komisi</span>
            <span className="font-black">{formatRupiah(order.commission ?? 0)}</span>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded bg-slate-200 px-4 py-3 font-black text-slate-700" onClick={onCancel}>
            Membatalkan
          </button>
          <button className="rounded bg-forest px-4 py-3 font-black text-white disabled:bg-slate-400" disabled={isSubmitting} onClick={onConfirm}>
            Ya, Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
