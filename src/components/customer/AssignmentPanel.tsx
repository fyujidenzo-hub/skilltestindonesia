import { CheckCircle2, Clock, Package } from "lucide-react";
import { useState } from "react";
import type { Order, Product } from "../../types";
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
  onAcceptTask: () => void;
  onSubmitOrder: () => void;
  onTopUp?: () => void;
  isLoading?: boolean;
}

export default function AssignmentPanel({
  order,
  products,
  memberBalance,
  onAcceptTask,
  onSubmitOrder,
  onTopUp,
  isLoading = false,
}: AssignmentPanelProps) {
  const [showWalletValidation, setShowWalletValidation] = useState(false);
  const state = getOrderState(order);
  const hasProducts = hasProductsAssigned(order);
  const assignedProduct = order && products.find((p) => p.code === order.productCode);

  const handleSubmitClick = () => {
    // Show wallet validation modal
    setShowWalletValidation(true);
  };

  const handleWalletConfirm = () => {
    setShowWalletValidation(false);
    // Check if balance is sufficient
    if (memberBalance >= (order?.requiredBalance || 0)) {
      onSubmitOrder();
    } else {
      // Balance insufficient, user needs to top up
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
            {isLoading ? "Accepting..." : "Accept Task"}
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
            <h3 className="font-bold mb-2">Waiting for Assignment</h3>
            <p className="text-sm text-slate-600 mb-4">
              Your task has been accepted. Admin will assign products to you shortly.
            </p>
            <div className="text-xs text-slate-500">
              Status: <span className="font-semibold text-amber-700">Waiting Assignment</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STATE 3 & 4: Product Assigned / Waiting Shipment
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

            {assignedProduct && (
              <div className="rounded border border-slate-200 p-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Product</p>
                    <p className="font-bold">{assignedProduct.name}</p>
                    <p className="text-sm text-slate-600">{assignedProduct.code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Price</p>
                    <p className="font-bold">{formatRupiah(assignedProduct.price)}</p>
                    <p className="text-sm text-emerald-700">
                      Commission: {formatRupiah(assignedProduct.commission)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded bg-slate-50 p-4 mb-4">
              <p className="text-xs text-slate-500 uppercase mb-2">Required Balance</p>
              <p className="font-bold text-lg">{formatRupiah(order?.requiredBalance || 0)}</p>
              <p className="text-xs text-slate-500 mt-2">Your balance: {formatRupiah(memberBalance)}</p>
            </div>
          </div>

          {state === "product_assigned" && (
            <button
              onClick={handleSubmitClick}
              disabled={isLoading}
              className="w-full rounded bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {isLoading ? "Submitting..." : "Yes, Send Order"}
            </button>
          )}

          {(state === "waiting_shipment" || state === "belum_diserahkan") && (
            <div className="rounded bg-orange-50 p-4 border border-orange-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm mb-1">Order Submitted</p>
                  <p className="text-xs text-slate-600">
                    Your order has been submitted and is waiting for delivery confirmation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {state === "diserahkan" && (
            <div className="rounded bg-emerald-50 p-4 border border-emerald-200">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm mb-1">Order Completed</p>
                  <p className="text-xs text-slate-600">
                    Your order has been successfully completed and delivered.
                  </p>
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
      </>
    );
  }

  return null;
}
