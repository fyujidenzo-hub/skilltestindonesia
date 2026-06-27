import { Filter, Plus } from "lucide-react";
import { useState } from "react";
import { Field, inputClass, Panel } from "../common";
import { statusStyles } from "../../constants";
import { assignOrderProduct, createOrder } from "../../services/ordersService";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { formatRupiah, shortDate } from "../../utils";
import Filters from "./Filters";

export default function OrderTable({ orders, members, products }: { orders: Order[]; members: Member[]; products: Product[] }) {
  const { dispatch } = useAppStore();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const assignTask = async (event: React.FormEvent) => {
    event.preventDefault();
    const member = members.find((item) => item.id === memberId);
    const product = products.find((item) => item.id === productId);

    if (!member || !product) {
      setMessage("Select a worker/member and product task first.");
      return;
    }

    if (product.quantity <= 0) {
      setMessage("This product task has no quantity left.");
      return;
    }

    setSaving(true);
    setMessage("Assigning task...");

    try {
      const waitingOrder = orders.find((order) => order.member === member.username && order.status === "waiting");
      if (waitingOrder) {
        const order = await assignOrderProduct(waitingOrder, product);
        dispatch({ type: "updateOrder", payload: order });
      } else {
        const waitingTask = await createOrder({
          memberId: member.id,
          member: member.username,
          admin: member.referredBy,
          value: 0,
          commission: 0,
          requiredBalance: 0,
          status: "waiting",
          createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        });
        const order = await assignOrderProduct(waitingTask, product);
        dispatch({ type: "addOrder", payload: order });
      }
      setMemberId("");
      setProductId("");
      setShowAssignForm(false);
      setMessage("Task assigned to worker and saved to Firebase.");
    } catch (error) {
      console.error("Failed to assign task:", error);
      setMessage("Firebase save failed. Check Firestore order rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Order Intake Records"
      action={
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white" onClick={() => setShowAssignForm(!showAssignForm)}>
            <Plus size={16} /> Assign task
          </button>
          <button className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold"><Filter size={16} /> Filters</button>
        </div>
      }
    >
      {showAssignForm && (
        <form className="mb-5 grid gap-4 rounded bg-slate-50 p-4" onSubmit={assignTask}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Worker / member">
              <select className={inputClass} required value={memberId} onChange={(event) => setMemberId(event.target.value)}>
                <option value="">Select worker</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.username} - {member.referredBy}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Product task">
              <select className={inputClass} required value={productId} onChange={(event) => setProductId(event.target.value)}>
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code} - {product.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {message && (
            <p className={`rounded px-3 py-2 text-sm font-semibold ${message.includes("failed") || message.includes("Select") || message.includes("quantity") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {message}
            </p>
          )}
          <button disabled={saving} className="rounded bg-forest px-4 py-3 font-bold text-white disabled:bg-slate-400">
            {saving ? "Assigning..." : "Assign task to worker"}
          </button>
        </form>
      )}
      <Filters />
      <div className="mt-4 grid gap-4">
        {orders.length ? orders.map((order) => (
          <article key={order.id} className="grid gap-4 rounded border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1.3fr_1fr_auto] md:items-center">
            <div>
              <p className="text-xs uppercase text-slate-500">Worker</p>
              <p className="font-bold">{order.member}</p>
              <p className="text-xs text-slate-500">{order.admin ?? "Unassigned admin"}</p>
              <p className="text-xs text-slate-500">{shortDate(order.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Product</p>
              <p className="font-semibold">{order.productName ?? "Waiting for assignment"}</p>
              <p className="text-xs text-slate-500">{order.productCode ?? order.referenceNumber ?? order.id}</p>
            </div>
            <div>
              <p className="font-bold">{formatRupiah(order.value)}</p>
              <p className="text-sm text-emerald-700">Commission {formatRupiah(order.commission)}</p>
            </div>
            <div className="grid gap-2">
              <span className={`w-fit rounded px-3 py-1 text-xs font-bold capitalize ${statusStyles[order.status]}`}>{order.status}</span>
              {order.status === "assigned" && <span className="text-xs font-bold text-slate-500">Waiting for worker submission</span>}
            </div>
          </article>
        )) : (
          <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">No order records in this admin scope yet.</p>
        )}
      </div>
    </Panel>
  );
}
