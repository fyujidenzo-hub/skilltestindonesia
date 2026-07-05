import { AlertCircle, CheckCircle2, Clock, PackageCheck, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader, { type CustomerNotification } from "../components/customer/CustomerHeader";
import CustomerHero from "../components/customer/CustomerHero";
import DepositDestination from "../components/customer/DepositDestination";
import PremiumBanner from "../components/customer/PremiumBanner";
import RecentRecords from "../components/customer/RecentRecords";
import StoreShortcutGrid from "../components/customer/StoreShortcutGrid";
import TransactionModal from "../components/customer/TransactionModal";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { completeWorkflowOrder, createOrder, submitWorkflowOrder, updateOrderStatus } from "../services/ordersService";
import { getOrderCode } from "../services/orderCode";
import { getOrderState } from "../services/orderStateService";
import { updateMember } from "../services/membersService";
import { useAppStore } from "../store/AppStore";
import type { Order, Product, Transaction } from "../types";
import { formatRupiah, shortDate } from "../utils";

const favoriteStoragePrefix = "tokopedia-product-favorites";

export default function CustomerPage({ navigate }: { navigate: Navigate }) {
  const { state, dispatch, ready } = useAppStore();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeModal, setActiveModal] = useState<"topup" | "withdraw" | null>(null);
  const [taskMessage, setTaskMessage] = useState("");
  const [loginAlert, setLoginAlert] = useState("");
  const [showTaskStatus, setShowTaskStatus] = useState(false);
  const [isAcceptingTask, setIsAcceptingTask] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeCustomerId, setActiveCustomerIdState] = useState(() => getActiveCustomerId());

  const currentMember = activeCustomerId ? state.members.find((member) => member.id === activeCustomerId) : undefined;
  const favoriteStorageKey = currentMember ? `${favoriteStoragePrefix}:${currentMember.id}` : `${favoriteStoragePrefix}:guest`;

  useEffect(() => {
    const storedCustomerId = getActiveCustomerId();
    setActiveCustomerIdState(storedCustomerId);

    if (ready && storedCustomerId && state.members.length > 0 && !state.members.some((member) => member.id === storedCustomerId)) {
      clearActiveCustomerId();
      setActiveCustomerIdState(null);
    }
  }, [ready, state.members]);

  useEffect(() => {
    if (currentMember && Array.isArray(currentMember.favoriteProductIds)) {
      setFavorites(currentMember.favoriteProductIds);
      try {
        window.localStorage.setItem(favoriteStorageKey, JSON.stringify(currentMember.favoriteProductIds));
      } catch (error) {
        console.warn("Unable to cache product favorites:", error);
      }
      return;
    }

    try {
      const storedFavorites = window.localStorage.getItem(favoriteStorageKey);
      const parsedFavorites = storedFavorites ? JSON.parse(storedFavorites) : [];
      setFavorites(Array.isArray(parsedFavorites) ? parsedFavorites : []);
    } catch (error) {
      console.warn("Unable to load product favorites:", error);
      setFavorites([]);
    }
  }, [currentMember, favoriteStorageKey]);

  const activeOrder = currentMember
    ? state.orders.find((order) => 
        order.member === currentMember.username && 
        !["completed", "diserahkan", "rejected"].includes(order.status)
      ) ?? null
    : null;

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
        tone: order.status === "frozen" ? ("danger" as const) : ("info" as const),
        targetPath: "/orders",
      }));

    const transactionNotifications = state.transactions
      .filter((transaction) => transaction.member === currentMember.username)
      .slice(0, 4)
      .map((transaction) => ({
        id: `transaction-${transaction.id}`,
        title: getCustomerTransactionTitle(transaction),
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

  const filteredProducts = useMemo(
    () => state.products.filter((product) => `${product.name} ${product.code} ${product.category}`.toLowerCase().includes(query.toLowerCase())),
    [query, state.products],
  );

  const toggleFavorite = async (productId: string) => {
    const nextFavorites = favorites.includes(productId) ? favorites.filter((id) => id !== productId) : Array.from(new Set([...favorites, productId]));
    setFavorites(nextFavorites);

    try {
      window.localStorage.setItem(favoriteStorageKey, JSON.stringify(nextFavorites));
    } catch (error) {
      console.warn("Unable to cache product favorites:", error);
    }

    if (!currentMember) return;

    const updatedMember = { ...currentMember, favoriteProductIds: nextFavorites };
    dispatch({ type: "updateMember", payload: updatedMember });

    try {
      await updateMember(currentMember.id, { favoriteProductIds: nextFavorites });
    } catch (error) {
      console.error("Unable to sync favorites to Firebase:", error);
      setTaskMessage("Favorite saved on this device, but Firebase sync failed. Check Firestore rules.");
    }
  };

  const handleAcceptTask = async (product?: Product) => {
    if (!currentMember) {
      setLoginAlert("You have to log in first!");
      return;
    }
    if (activeOrder) {
      setTaskMessage("You already have an active task. Complete it before taking another task.");
      return;
    }

    setIsAcceptingTask(true);
    try {
      const order = await createOrder({
        memberId: currentMember.id,
        member: currentMember.username,
        admin: currentMember.referredBy,
        productCode: product?.code ?? "",
        productName: product?.name ?? "",
        quantity: product ? 1 : 0,
        assignedProducts: product
          ? [
              {
                productId: product.id,
                code: product.code,
                name: product.name,
                price: product.price,
                commission: product.commission,
                quantity: 1,
                total: product.price,
              },
            ]
          : [],
        value: product?.price ?? 0,
        commission: product?.commission ?? 0,
        requiredBalance: product?.price ?? 0,
        status: "waiting_assignment",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      });
      dispatch({ type: "addOrder", payload: order });
      setTaskMessage(product ? "Permintaan produk telah dikirim. Menunggu persetujuan admin." : "Pesanan berhasil diterima. Menunggu admin menetapkan produk.");
    } catch (error) {
      console.error("Failed to accept task:", error);
      setTaskMessage("Tidak dapat menerima tugas. Silakan coba lagi.");
    } finally {
      setIsAcceptingTask(false);
    }
  };

  const handleStartShipment = async () => {
    if (!activeOrder) return;
    if (activeOrder.status === "waiting_shipment") return;

    const order = await updateOrderStatus(activeOrder, "waiting_shipment", {
      submittedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    });
    dispatch({ type: "updateOrder", payload: order });
  };

  const handleSubmitOrder = async () => {
    if (!activeOrder || !currentMember) return;

    setIsSubmittingOrder(true);
    try {
      const result = await submitWorkflowOrder(
        {
          ...activeOrder,
          submittedAt: activeOrder.submittedAt ?? new Date().toISOString().slice(0, 16).replace("T", " "),
        },
        currentMember,
      );
      dispatch({ type: "completeOrderWithMember", payload: result });
      setTaskMessage("Pesanan berhasil dikirimkan. Saldo Anda tidak dipotong. Komisi akan ditambahkan setelah penyelesaian.");
    } catch (error) {
      console.error("Failed to submit order:", error);
      setTaskMessage(error instanceof Error ? error.message : "Tidak dapat mengirimkan pesanan. Silakan coba lagi.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!activeOrder || !currentMember) return;

    setIsSubmittingOrder(true);
    try {
      const result = await completeWorkflowOrder(activeOrder, currentMember);
      dispatch({ type: "completeOrderWithMember", payload: result });
      setTaskMessage(`Pesanan selesai. Komisi. ${result.order.commission.toLocaleString("id-ID")} IDR telah ditambahkan ke saldo Anda.`);
    } catch (error) {
      console.error("Failed to confirm shipment:", error);
      setTaskMessage(error instanceof Error ? error.message : "Tidak dapat mengonfirmasi pengiriman.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleAcceptChangedProduct = async () => {
    if (!activeOrder) return;
    setIsSubmittingOrder(true);
    try {
      const order = await updateOrderStatus(activeOrder, "product_assigned", {
        requiresCustomerApproval: false,
      });
      dispatch({ type: "updateOrder", payload: order });
      setTaskMessage("Produk yang diubah telah disetujui. Anda sekarang dapat mengirimkan pesanan tersebut.");
    } catch (error) {
      console.error("Failed to accept changed product:", error);
      setTaskMessage(error instanceof Error ? error.message : "Unable to accept changed product.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleRejectChangedProduct = async () => {
    if (!activeOrder) return;
    setIsSubmittingOrder(true);
    try {
      const order = await updateOrderStatus(activeOrder, "rejected", {
        requiresCustomerApproval: false,
        completedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      });
      dispatch({ type: "updateOrder", payload: order });
      setTaskMessage("Produk yang digantung ditolak. Anda dapat mengambil pesanan lain.");
    } catch (error) {
      console.error("Failed to reject changed product:", error);
      setTaskMessage(error instanceof Error ? error.message : "Tidak dapat menolak produk yang telah diubah.");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const requireLogin = (nextAction: () => void) => {
    if (!currentMember) {
      setLoginAlert("Anda harus masuk terlebih dahulu!");
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
    <main className="grid min-h-screen place-items-center customer-page-bg px-4 text-ink">
      <div className="rounded-2xl bg-white/90 px-6 py-5 text-sm font-bold text-slate-600 shadow-panel backdrop-blur">
        Memulihkan sesi anggota...
      </div>
    </main>
  );
}

if (state.members.length === 0) {
  return (
    <main className="flex min-h-screen items-center justify-center customer-page-bg px-4 pb-24 text-ink">
      <div className="rounded-3xl bg-white/90 p-6 text-center shadow-panel backdrop-blur sm:p-8">
        <h1 className="mb-4 text-2xl font-black sm:text-3xl">
          Tidak ada data yang tersedia
        </h1>

        <p className="mb-6 text-sm font-semibold text-slate-600 sm:text-base">
         Harap isi Firestore dengan data contoh untuk melanjutkan.
        </p>

        <button
          onClick={() => navigate("/admin")}
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700"
        >
          Buka Panel Admin
        </button>
      </div>
    </main>
  );
}

return (
  <main className="min-h-screen customer-page-bg pb-24 text-ink">
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
      username={currentMember?.username}
      phone={currentMember?.phone}
      onTopUp={() => requireLogin(() => setActiveModal("topup"))}
      onWithdraw={() => requireLogin(() => setActiveModal("withdraw"))}
    />

    {loginAlert && (
      <LoginRequiredAlert
        message={loginAlert}
        onClose={() => setLoginAlert("")}
        onLogin={() => {
          setLoginAlert("");
          navigate("/login");
        }}
      />
    )}

    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
      <StoreShortcutGrid
        navigate={navigate}
        isLoggedIn={Boolean(currentMember)}
        onTopUp={() => requireLogin(() => setActiveModal("topup"))}
        onWithdraw={() => requireLogin(() => setActiveModal("withdraw"))}
      />

      {taskMessage && (
        <p className="mt-5 rounded-2xl bg-emerald-50/95 p-4 text-sm font-bold text-emerald-700 shadow-sm backdrop-blur">
          {taskMessage}
        </p>
      )}

      <div className="mx-auto mt-6 w-full max-w-4xl">
        <RecentRecords
          transactions={
            currentMember
              ? state.transactions.filter(
                  (transaction) =>
                    transaction.member === currentMember.username
                )
              : []
          }
        />
      </div>
    </section>

      <BottomNavbar isLoggedIn={Boolean(activeCustomerId)} navigate={navigate} active="home" />
      {activeModal && currentMember && (
        <TransactionModal type={activeModal} member={currentMember.username} admin={currentMember.referredBy} banks={state.banks} onClose={() => setActiveModal(null)} />
      )}
      {showTaskStatus && currentMember && (
        <TaskStatusModal
          order={activeOrder}
          products={state.products}
          balance={currentMember.balance}
          onClose={() => setShowTaskStatus(false)}
          onTakeOrder={() => {
            setShowTaskStatus(false);
            handleAcceptTask();
          }}
          onTopUp={() => {
            setShowTaskStatus(false);
            requireLogin(() => setActiveModal("topup"));
          }}
          onOpenOrders={() => {
            setShowTaskStatus(false);
            navigate("/orders");
          }}
        />
      )}
    </main>
  );
}

function TaskStatusModal({
  order,
  products,
  balance,
  onClose,
  onTakeOrder,
  onTopUp,
  onOpenOrders,
}: {
  order: Order | null;
  products: Product[];
  balance: number;
  onClose: () => void;
  onTakeOrder: () => void;
  onTopUp: () => void;
  onOpenOrders: () => void;
}) {
  const state = getOrderState(order);
  const assignedProduct = order?.assignedProducts?.[0];
  const fallbackProduct = order?.productCode ? products.find((product) => product.code === order.productCode) : undefined;
  const productName = assignedProduct?.name ?? order?.productName ?? fallbackProduct?.name ?? "No product assigned yet";
  const requiredBalance = order?.requiredBalance ?? order?.value ?? 0;
  const shortage = Math.max(0, requiredBalance - balance);
  const steps = [
    { key: "waiting_assignment", label: "Task taken", icon: <Clock size={16} /> },
    { key: "product_assigned", label: "Product assigned", icon: <PackageCheck size={16} /> },
    { key: "waiting_shipment", label: "Waiting shipment", icon: <Truck size={16} /> },
    { key: "diserahkan", label: "Completed", icon: <CheckCircle2 size={16} /> },
  ];
  const activeIndex = state === "no_task" ? -1 : state === "belum_diserahkan" ? 2 : steps.findIndex((step) => step.key === state);

  const statusLabel =
    state === "no_task"
      ? "Tidak ada tugas aktif"
      : state === "waiting_assignment"
        ? "Menunggu penugasan admin"
        : state === "product_assigned"
          ? "Siap dikirim"
          : state === "waiting_shipment" || state === "belum_diserahkan"
            ? "Menunggu pengiriman"
            : "Selesai";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 px-4">
      <div className="w-full max-w-2xl overflow-hidden rounded bg-white shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-forest">Laporan status tugas</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{statusLabel}</h2>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded hover:bg-slate-100" onClick={onClose} aria-label="Close task status">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            {steps.map((step, index) => {
              const active = index <= activeIndex;
              return (
                <div key={step.key} className={`rounded border p-3 ${active ? "border-emerald-200 bg-emerald-50 text-forest" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-full ${active ? "bg-forest text-white" : "bg-white text-slate-400"}`}>{step.icon}</span>
                    <span className="text-xs font-black">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 rounded bg-slate-50 p-4 sm:grid-cols-2">
            <StatusItem label="Transaction number" value={order ? getOrderCode(order) : "No task accepted"} />
            <StatusItem label="Date" value={order?.createdAt ? shortDate(order.createdAt) : "-"} />
            <StatusItem label="Assigned product" value={productName} />
            <StatusItem label="Order amount" value={formatRupiah(requiredBalance)} />
            <StatusItem label="Commission" value={formatRupiah(order?.commission ?? 0)} />
          </div>

          {shortage > 0 && (
            <div className="rounded border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
             Maaf, saldo Anda tidak mencukupi. {formatRupiah(shortage)}. Silakan isi saldo terlebih dahulu.
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {state === "no_task" ? (
              <button className="flex-1 rounded bg-forest px-4 py-3 font-black text-white" onClick={onTakeOrder}>
                Menerima Pesanan
              </button>
            ) : (
              <button className="flex-1 rounded bg-forest px-4 py-3 font-black text-white" onClick={onOpenOrders}>
                Perintah tugas yang sedang berjalan
              </button>
            )}
            <button className="flex-1 rounded border border-slate-200 px-4 py-3 font-black text-slate-700 hover:bg-slate-50" onClick={onTopUp}>
              Isi ulang saldo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-black text-slate-900">{value}</p>
    </div>
  );
}

function LoginRequiredAlert({ message, onClose, onLogin }: { message: string; onClose: () => void; onLogin: () => void }) {
  return (
    <div className="fixed inset-x-0 top-20 z-50 mx-auto w-[calc(100%-2rem)] max-w-md">
      <div className="rounded bg-white p-4 shadow-panel ring-1 ring-red-100">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-red-50 text-coral">
            <AlertCircle size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-slate-900">{message}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">Silakan masuk sebelum melakukan isi ulang, penarikan, atau tugas pemesanan.</p>
            <button className="mt-3 rounded bg-forest px-4 py-2 text-sm font-black text-white" onClick={onLogin}>
              Masuk sekarang
            </button>
          </div>
          <button className="grid h-8 w-8 shrink-0 place-items-center rounded hover:bg-slate-100" onClick={onClose} aria-label="Close login alert">
            <X size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}


function getCustomerTransactionTitle(transaction: Transaction) {
  const label = transaction.type === "reward" ? "Balance Reward" : transaction.type === "topup" ? "Balance Top-up" : "Withdrawal";
  return transaction.status === "pending" ? `${label} pending` : `${label} ${transaction.status}`;
}
