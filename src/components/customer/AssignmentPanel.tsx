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
      <div className="rounded bg-white p-6 shadow-panel">
        <div className="text-center">
          <Package size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-bold mb-2">No Task Assigned</h3>
          <p className="text-sm text-slate-500 mb-6">
            Accept a task to get started with your orders.
          </p>
          <button
            onClick={onAcceptTask}
            disabled={isLoading}
            className="w-full rounded bg-forest px-4 py-3 font-bold text-white hover:bg-forest/90 disabled:bg-slate-400"
          >
            {isLoading ? "Accepting..." : "Take Order"}
          </button>
        </div>
      </div>
    );
  }

  // STATE 2: Waiting for Assignment
  if (state === "waiting_assignment") {
    return (
      <div className="rounded bg-white p-6 shadow-panel border-2 border-amber-200">
        <div className="flex items-start gap-4">
          <Clock className="text-amber-600 flex-shrink-0 mt-1" size={24} />
          <div className="flex-1">
            <h3 className="font-bold mb-2">Waiting for delivery</h3>
            <p className="text-sm text-slate-600 mb-4">
              Your order task has been taken. Admin will add the assigned product.
            </p>
            <div className="text-xs text-slate-500">
              Status: <span className="font-semibold text-amber-700">Not delivered</span>
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
        <div className="rounded bg-white p-6 shadow-panel">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Assigned Products</h3>
              <span className="text-xs font-bold px-2 py-1 rounded bg-sky-100 text-sky-700">
                {getOrderStateLabel(state)}
              </span>
            </div>

            <div className="space-y-3">
              {assignedProducts.map((product) => (
                <div key={`${product.code}-${product.quantity}`} className="rounded border border-slate-200 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Product</p>
                      <p className="font-bold">{product.name}</p>
                      <p className="text-sm text-slate-600">{product.code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase">Qty / Total</p>
                      <p className="font-bold">{product.quantity} × {formatRupiah(product.price)}</p>
                      <p className="text-sm text-emerald-700">
                        Commission: {formatRupiah(product.commission * product.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded bg-slate-50 p-4 mb-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Required Balance</p>
              <p className="font-bold text-lg">{formatRupiah(order?.requiredBalance || 0)}</p>
              <p className="text-xs text-slate-500 mt-2">Your balance: {formatRupiah(memberBalance)}</p>
            </div>
          </div>

          {(state === "product_assigned" || state === "waiting_shipment") && (
            <button
              onClick={handleSubmitClick}
              disabled={isLoading}
              className="w-full rounded bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {isLoading ? "Submitting..." : state === "product_assigned" ? "Send Order" : "Yes, Send"}
            </button>
          )}

          {(state === "belum_diserahkan" || state === "diserahkan") && (
            <div className="rounded bg-emerald-50 p-4 border border-emerald-200">
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
                      className="mt-3 w-full rounded bg-forest px-3 py-2 text-xs font-bold text-white disabled:bg-slate-400"
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
