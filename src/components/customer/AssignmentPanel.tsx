import { useState } from "react";
import type { Order, Product } from "../../types";
import { formatRupiah } from "../../utils";

interface AssignmentPanelProps {
  order?: Order;
  featuredProduct?: Product;
  memberBalance: number;
  onTopUp: () => void;
  onComplete: (orderId: string) => void;
}

export default function AssignmentPanel({ order, featuredProduct, memberBalance, onTopUp, onComplete }: AssignmentPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const requiredBalance = order?.requiredBalance ?? 0;
  const missingBalance = Math.max(0, requiredBalance - memberBalance);
  const canSubmit = Boolean(order && order.status === "assigned" && missingBalance === 0);

  const sendOrder = () => {
    if (!order) return;
    if (order.status !== "assigned") {
      setError("This task is waiting for administrator assignment or shipment.");
      return;
    }
    if (missingBalance > 0) {
      setError(`Insufficient work balance. Please top up ${formatRupiah(missingBalance)} more to continue.`);
      return;
    }
    setError("");
    setConfirming(true);
  };

  return (
    <section id="assignment" className="rounded bg-white p-5 shadow-panel">
      <h2 className="text-lg font-black">Current assignment</h2>
      {order ? (
        <>
          {featuredProduct && <img className="mt-4 h-40 w-full rounded object-cover" src={featuredProduct.image} alt={order.productName ?? "Assigned product"} />}
          <p className="mt-4 text-xs font-bold uppercase text-slate-500">Transaction number</p>
          <p className="font-black text-forest">{order.referenceNumber ?? order.id}</p>
          <p className={`mt-3 rounded px-3 py-2 text-sm font-bold ${order.status === "waiting" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
            {order.status === "waiting" ? "Waiting for order assignment or shipment." : "Order assigned. Ready to send."}
          </p>
          <p className="mt-4 font-bold">{order.productName ?? "Product pending assignment"}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <p>
              <span className="block text-xs text-slate-500">Order value</span>
              {formatRupiah(order.value)}
            </p>
            <p>
              <span className="block text-xs text-slate-500">Commission</span>
              {formatRupiah(order.commission)}
            </p>
            <p>
              <span className="block text-xs text-slate-500">Order total</span>
              {formatRupiah(0)}
            </p>
            <p>
              <span className="block text-xs text-slate-500">Required balance</span>
              {formatRupiah(requiredBalance)}
            </p>
          </div>
          {error && (
            <div className="mt-4 rounded bg-red-50 p-3 text-sm font-bold text-red-700">
              {error}
              {missingBalance > 0 && (
                <button className="mt-3 w-full rounded bg-forest px-3 py-2 text-white" onClick={onTopUp}>
                  Top up now
                </button>
              )}
            </div>
          )}
          {confirming ? (
            <div className="mt-4 rounded bg-slate-50 p-4">
              <p className="font-black">Confirm simulated order</p>
              <p className="mt-2 text-sm text-slate-600">No product purchase will be made. Your order total remains {formatRupiah(0)} and only the commission will be added after submission.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="rounded border border-slate-200 px-3 py-2 text-sm font-bold" onClick={() => setConfirming(false)}>
                  Back
                </button>
                <button className="rounded bg-forest px-3 py-2 text-sm font-bold text-white" onClick={() => onComplete(order.id)}>
                  Confirm submit
                </button>
              </div>
            </div>
          ) : (
          <button className="mt-4 w-full rounded bg-coral px-3 py-3 text-sm font-bold text-white disabled:bg-slate-300" disabled={!canSubmit} onClick={sendOrder}>
            Send order
          </button>
          )}
        </>
      ) : (
        <p className="mt-4 rounded bg-slate-50 p-4 text-sm text-slate-500">No active assignment. Take an order from the product list.</p>
      )}
    </section>
  );
}
