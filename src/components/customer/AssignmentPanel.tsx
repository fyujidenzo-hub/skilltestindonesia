import { CheckCircle2, Clock, Package, FileText } from "lucide-react";
import { useState } from "react";
import Receipt from "./Receipt";
import type { Member, Order, Product } from "../../types";
import { formatRupiah } from "../../utils";
import { 
  getOrderState, 
  getOrderStateLabel, 
  hasProductsAssigned 
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

  const handleSubmitClick = async () => {
    try {
      await onStartShipment?.();
      setShowWalletValidation(true);
    } catch (error) {
      console.error("Failed to prepare shipment confirmation:", error);
    }
  };

  const handleWalletConfirm = () => {
    setShowWalletValidation(false);
    if (memberBalance >= (order?.requiredBalance || 0)) {
      onSubmitOrder();
    } else {
      onTopUp?.();
    }
  };

  // STATE 1: No Task
  if (state === "no_task") {
    return (
      <div className="rounded-3xl border border-white bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-slate-50 text-slate-300 ring-1 ring-slate-100">
            <Package size={34} />
          </div>
          <h3 className="text-lg font-bold mb-2">No Task Assigned</h3>
          <p className="text-sm text-slate-500 mb-6">
            Take a general task, or select a product card to request a specific order.
          </p>
          <button
            onClick={onAcceptTask}
            disabled={isLoading}
            className="hidden w-full rounded-2xl bg-forest px-4 py-3 font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-panel disabled:bg-slate-400"
          >
            {isLoading ? "Accepting..." : "Take Order"}
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
            <h3 className="font-bold mb-2">{requestedProductName ? "Waiting for approval" : "Waiting for delivery"}</h3>
            <p className="text-sm text-slate-600 mb-4">
              {requestedProductName
                ? `Your request for ${requestedProductName} has been sent. Admin will approve it before you can send the order.`
                : "Your order task has been taken. Admin will add the assigned product."}
            </p>
            <div className="text-xs text-slate-500">
              Status: <span className="font-semibold text-amber-700">{requestedProductName ? "Pending approval" : "Not delivered"}</span>
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Assigned Products</h3>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                {getOrderStateLabel(state)}
              </span>
            </div>

            <div className="space-y-3">
              {assignedProducts.map((product) => {
                const catalogProduct = products.find((item) => item.id === product.productId || item.code === product.code);

                return (
                <div key={`${product.code}-${product.productId}`} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="grid gap-4 sm:grid-cols-[88px_1fr_1fr]">
                    {catalogProduct?.image && (
                      <img className="h-20 w-20 rounded-xl border border-slate-200 bg-white object-cover" src={catalogProduct.image} alt={product.name} />
                    )}
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Product</p>
                      <p className="font-bold">{product.name}</p>
                      <p className="text-sm text-slate-600">{product.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Order Price</p>
                      <p className="font-bold">{formatRupiah(product.price * product.quantity)}</p>
                      <p className="text-sm text-emerald-700">
                        Commission: {formatRupiah(product.commission * product.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
              <p className="text-xs text-slate-500 uppercase mb-2">Required Balance</p>
              <p className="font-bold text-lg">{formatRupiah(order?.requiredBalance || 0)}</p>
              <p className="text-xs text-slate-500 mt-2">Your balance: {formatRupiah(memberBalance)}</p>
            </div>
          </div>

          {(state === "product_assigned" || state === "waiting_shipment") && (
            order?.requiresCustomerApproval ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-black text-amber-800">Admin changed the product</p>
                <p className="mt-1 text-xs text-amber-700">Review the assigned product above. Accept it to continue, or reject it to cancel this task.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={onAcceptChangedProduct}
                    disabled={isLoading}
                    className="rounded-xl bg-forest px-4 py-3 text-sm font-black text-white disabled:bg-slate-400"
                  >
                    Accept Product
                  </button>
                  <button
                    onClick={onRejectChangedProduct}
                    disabled={isLoading}
                    className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:bg-slate-400"
                  >
                    Reject Product
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubmitClick}
                disabled={isLoading}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-panel disabled:bg-slate-400"
              >
                {isLoading ? "Submitting..." : state === "product_assigned" ? "Send Order" : "Yes, Send"}
              </button>
            )
          )}

          {(state === "belum_diserahkan" || state === "diserahkan") && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm mb-1">
                    {state === "diserahkan" ? "Order Completed" : "Awaiting Delivery"}
                  </p>
                  <p className="text-xs text-slate-600">
                    {state === "diserahkan"
                      ? "Your order has been successfully completed and delivered."
                      : "Your order has been submitted and is waiting for delivery confirmation."}
                  </p>
                  <button
                    onClick={() => setShowReceipt(true)}
                    className="text-xs font-bold text-emerald-700 hover:underline mt-2"
                  >
                    Download Receipt →
                  </button>
                  {state === "belum_diserahkan" && (
                    <button
                      onClick={onConfirmDelivery}
                      disabled={isLoading}
                      className="mt-3 w-full rounded-xl bg-forest px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
                    >
                      Confirm Shipment
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {showWalletValidation && (
          <WalletValidationModal
            member={{ balance: memberBalance } as any}
            requiredBalance={order?.requiredBalance || 0}
            onConfirm={handleWalletConfirm}
            onCancel={() => setShowWalletValidation(false)}
            isLoading={isLoading}
          />
        )}

        {showReceipt && order && member && (
          <Receipt
            order={order}
            member={member}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </>
    );
  }

  return null;
}