import { AlertCircle, CheckCircle2, Clock, Package } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Receipt from "./Receipt";
import type { Member, Order, Product } from "../../types";
import { formatRupiah } from "../../utils";
import {
  getOrderState,
  getOrderStateLabel,
  hasProductsAssigned,
} from "../../services/orderStateService";
import WalletValidationModal from "./WalletValidationModal";

interface AssignmentPanelProps {
  order: Order | null;
  products: Product[];
  memberBalance: number;
  member?: Member;
  onAcceptTask: () => void;
  onStartShipment?: () => void;
  onSubmitOrder: () => void;
  onConfirmDelivery?: () => void;
  onAcceptChangedProduct?: () => void;
  onRejectChangedProduct?: () => void;
  onTopUp?: () => void;
  isLoading?: boolean;
}

export default function AssignmentPanel({
  order,
  products,
  memberBalance,
  member,
  onAcceptTask,
  onStartShipment,
  onSubmitOrder,
  onConfirmDelivery,
  onAcceptChangedProduct,
  onRejectChangedProduct,
  onTopUp,
  isLoading = false,
}: AssignmentPanelProps) {
  const [showWalletValidation, setShowWalletValidation] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [balanceToastMessage, setBalanceToastMessage] = useState("");
  const balanceToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const state = getOrderState(order);
  const hasProducts = hasProductsAssigned(order);

  const assignedProduct = order && products.find((p) => p.code === order.productCode);

  const assignedProducts = order?.assignedProducts?.length
    ? order.assignedProducts
    : assignedProduct
      ? [
          {
            productId: assignedProduct.id,
            code: assignedProduct.code,
            name: assignedProduct.name,
            price: assignedProduct.price,
            commission: assignedProduct.commission,
            quantity: order?.quantity ?? 1,
            total: assignedProduct.price * (order?.quantity ?? 1),
          },
        ]
      : [];

const assignedOrderAmount = assignedProducts.length
  ? assignedProducts.reduce((sum, product) => {
      const quantity = Number(product.quantity ?? 1);
      const price = Number(product.price ?? 0);
      const total = Number(product.total ?? price * quantity);

      return sum + total;
    }, 0)
  : Number(order?.value || order?.requiredBalance || 0);

const assignedCommission = assignedProducts.length
  ? assignedProducts.reduce((sum, product) => {
      const quantity = Number(product.quantity ?? 1);
      const commission = Number(product.commission ?? 0);

      return sum + commission * quantity;
    }, 0)
  : Number(order?.commission || Math.round(assignedOrderAmount * 0.2));
  const currentBalance = Number(memberBalance || 0);

  // SAFETY:
  // User balance must be equal to or higher than the order amount before sending.
  // The order amount is NOT deducted. It is only an eligibility requirement.
  const hasEnoughBalanceForOrder = currentBalance >= assignedOrderAmount;
  const isZeroBalance = currentBalance <= 0;
  const cannotSendOrder = isLoading;

  useEffect(() => {
    return () => {
      if (balanceToastTimerRef.current) {
        clearTimeout(balanceToastTimerRef.current);
      }
    };
  }, []);

  const showInsufficientBalanceToast = () => {
    const shortAmount = Math.max(assignedOrderAmount - currentBalance, 0);

    setBalanceToastMessage(
      `Sorry, your balance is short by ${formatRupiah(shortAmount)} to process this order. Please top up your balance.`,
    );

    if (balanceToastTimerRef.current) {
      clearTimeout(balanceToastTimerRef.current);
    }

    balanceToastTimerRef.current = setTimeout(() => {
      setBalanceToastMessage("");
      balanceToastTimerRef.current = null;
    }, 2000);
  };

  const handleSubmitClick = async () => {
    // SAFETY:
    // Let the user press Submit Task, then validate balance.
    // If insufficient, show a 2-second inline toast inside the assigned-products area.
    if (!hasEnoughBalanceForOrder || isZeroBalance) {
      showInsufficientBalanceToast();
      return;
    }

    try {
      await onStartShipment?.();
      setShowWalletValidation(true);
    } catch (error) {
      console.error("Failed to prepare shipment confirmation:", error);
    }
  };

  const handleWalletConfirm = () => {
    // SAFETY:
    // If the balance changes before confirmation, do not submit.
    // Show the same inline toast instead of sending the user to top-up.
    if (!hasEnoughBalanceForOrder || isZeroBalance) {
      setShowWalletValidation(false);
      showInsufficientBalanceToast();
      return;
    }

    setShowWalletValidation(false);

    // SAFETY:
    // Sending an order does not deduct the product/order amount.
    // Balance changes only when the order is finalized and commission is credited once.
    onSubmitOrder();
  };

  // STATE 1: No Task
  if (state === "no_task") {
    const cannotAcceptTask = isLoading || isZeroBalance;

    return (
      <div className="rounded-3xl border border-white bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
            <Package size={34} />
          </div>

          <h3 className="mb-2 text-lg font-bold">Tidak Ada Tugas yang Ditugaskan</h3>

          <p className="mb-6 text-sm text-slate-500">
            Ambil tugas umum, atau pilih kartu produk untuk meminta pesanan khusus.
          </p>
          {isZeroBalance && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
              <div className="flex gap-2">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-700" />
                <p className="text-sm font-semibold text-amber-900">
                  Pengguna baru dengan saldo nol belum dapat menerima tugas pesanan. Harap tunggu bonus pendaftaran dari admin atau lakukan isi ulang saldo akun Anda terlebih dahulu.
                </p>
              </div>

              {onTopUp && (
                <button
                  type="button"
                  onClick={onTopUp}
                  className="mt-3 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700"
                >
                  Isi Saldo Sekarang
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onAcceptTask}
            disabled={cannotAcceptTask}
            className="hidden w-full rounded-2xl bg-forest px-4 py-3 font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-panel disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-70"
          >
            {isLoading ? "Accepting..." : isZeroBalance ? "Top Up Required" : "Take Order"}
          </button>
        </div>
      </div>
    );
  }

  // STATE 2: Waiting for Assignment
  if (state === "waiting_assignment") {
    const requestedProductName = order?.productName || order?.assignedProducts?.[0]?.name;

    return (
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <Clock size={24} />
          </span>

          <div className="flex-1">
            <h3 className="mb-2 font-bold">
              {requestedProductName ? "Waiting for approval" : "Waiting for delivery"}
            </h3>

            <p className="mb-4 text-sm text-slate-600">
              {requestedProductName
                ? `Permintaan Anda untuk ${requestedProductName} telah dikirim. Admin akan menyetujuinya sebelum Anda dapat mengirimkan pesanan.`
                : "Tugas pemesanan Anda telah diambil. Admin akan menambahkan produk yang ditugaskan."}
            </p>

            <div className="text-xs text-slate-500">
              Status:{" "}
              <span className="font-semibold text-amber-700">
                {requestedProductName ? "Pending approval" : "Not delivered"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE 3-4: Product Assigned / Waiting Shipment
  if (hasProducts) {
    return (
      <>
        <div className="rounded-3xl border border-white bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Produk yang Ditugaskan</h3>

              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                {getOrderStateLabel(state)}
              </span>
            </div>

            {balanceToastMessage && (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-5 text-emerald-900 shadow-sm"
              >
                {balanceToastMessage}
              </div>
            )}

            <div className="space-y-3">
              {assignedProducts.map((product) => {
                const catalogProduct = products.find(
                  (item) => item.id === product.productId || item.code === product.code,
                );

                return (
                  <div
                    key={`${product.code}-${product.productId}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-[88px_1fr_1fr]">
                      {catalogProduct?.image && (
                        <img
                          className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-cover"
                          src={catalogProduct.image}
                          alt={product.name}
                          loading="lazy"
                          decoding="async"
                        />
                      )}

                      <div>
                        <p className="text-xs uppercase text-slate-500">Produk</p>
                        <p className="font-bold">{product.name}</p>
                        <p className="text-sm text-slate-600">{product.code}</p>
                      </div>

                      <div>
                        <p className="text-xs uppercase text-slate-500">Harga Pesanan</p>
                        <p className="font-bold">
                          {formatRupiah(product.price * product.quantity)}
                        </p>
                        <p className="text-sm text-emerald-700">
                         Komisi: {formatRupiah(product.commission * product.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {(state === "product_assigned" || state === "waiting_shipment") && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-slate-600">Saldo Anda:</span>
                  <span className="font-black text-slate-900">
                    {formatRupiah(currentBalance)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-sm text-slate-600">Jumlah Pesanan:</span>
                  <span className="font-black text-slate-900">
                    {formatRupiah(assignedOrderAmount)}
                  </span>
                </div>

                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-sm text-slate-600">Komisi yang Diperoleh:</span>
                  <span className="font-black text-emerald-700">
                    + {formatRupiah(assignedCommission)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {(state === "product_assigned" || state === "waiting_shipment") &&
            (order?.requiresCustomerApproval ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-800">
                 Admin mengubah produk tersebut.
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  Tinjau produk yang ditugaskan di atas. Terima untuk melanjutkan, atau tolak untuk membatalkan tugas ini.
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onAcceptChangedProduct}
                    disabled={isLoading}
                    className="rounded-xl bg-forest px-4 py-3 text-sm font-black text-white disabled:bg-slate-400"
                  >
                    Terima Produk
                  </button>

                  <button
                    type="button"
                    onClick={onRejectChangedProduct}
                    disabled={isLoading}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-400"
                  >
                    Produk Ditolak
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSubmitClick}
                  disabled={cannotSendOrder}
                  className={`w-full rounded-2xl px-4 py-3 font-black text-white shadow-sm transition ${
                    cannotSendOrder
                      ? "cursor-not-allowed bg-slate-400 opacity-70"
                      : "bg-emerald-600 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-panel"
                  }`}
                >
                  {isLoading ? "Submitting..." : "Submit Task"}
                </button>
              </>
            ))}

          {(state === "belum_diserahkan" || state === "diserahkan") && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />

                <div>
                  <p className="mb-1 text-sm font-bold">
                    {state === "diserahkan" ? "Order Completed" : "Awaiting Delivery"}
                  </p>

                  <p className="text-xs text-slate-600">
                    {state === "diserahkan"
                      ? "Pesanan Anda telah berhasil diselesaikan dan dikirim."
                      : "Pesanan Anda telah diajukan dan sedang menunggu konfirmasi pengiriman."}
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowReceipt(true)}
                    className="mt-2 text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Unduh Bukti Pembayaran →
                  </button>

                  {state === "belum_diserahkan" && (
                    <button
                      type="button"
                      onClick={onConfirmDelivery}
                      disabled={isLoading}
                      className="mt-3 w-full rounded-xl bg-forest px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
                    >
                      Konfirmasi Pengiriman
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showWalletValidation && (
          <WalletValidationModal
            member={{ balance: memberBalance } as Member}
            requiredBalance={assignedOrderAmount}
            commission={assignedCommission}
            onConfirm={handleWalletConfirm}
            onCancel={() => setShowWalletValidation(false)}
            isLoading={isLoading}
          />
        )}

        {showReceipt && order && member && (
          <Receipt order={order} member={member} onClose={() => setShowReceipt(false)} />
        )}
      </>
    );
  }

  return null;
}
