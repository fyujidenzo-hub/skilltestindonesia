import { Archive, CheckCircle2, Clock3, PackageSearch, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Field, inputClass, Panel } from "../common";
import { formatRupiah, shortDate } from "../../utils";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { assignOrderProducts } from "../../services/ordersService";
import { getOrderCode } from "../../services/orderCode";
import { getOrderState, getOrderStateLabel, type OrderState } from "../../services/orderStateService";

interface TaskAssignmentTableProps {
  orders: Order[];
  members: Member[];
  products: Product[];
}

export default function TaskAssignmentTable({ orders, members, products }: TaskAssignmentTableProps) {
  const { dispatch } = useAppStore();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState("");
  const [activeQueue, setActiveQueue] = useState<"action" | "progress" | "archive">("action");
  const [query, setQuery] = useState("");

  // Filter orders that are waiting for assignment
  const waitingAssignmentOrders = orders.filter((order) => order.status === "waiting_assignment" || order.status === "waiting");
  const queueCounts = useMemo(() => getQueueCounts(orders), [orders]);
  const visibleOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const state = getOrderState(order);
        if (activeQueue === "action") return state === "waiting_assignment";
        if (activeQueue === "progress") return state === "product_assigned" || state === "waiting_shipment" || state === "belum_diserahkan";
        return state === "diserahkan";
      })
      .filter((order) => {
        const search = query.trim().toLowerCase();
        if (!search) return true;
        const member = members.find((item) => item.username === order.member);
        return [
          order.member,
          member?.phone,
          getOrderCode(order),
          order.productName,
          order.productCode,
          order.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search);
      });
  }, [activeQueue, members, orders, query]);

  const handleAssignProducts = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProductIds = Object.entries(selectedQuantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId]) => productId);

    if (!selectedOrderId || selectedProductIds.length === 0) {
      setMessage("Please select an order and at least one product");
      return;
    }

    const order = orders.find((o) => o.id === selectedOrderId);
    if (!order) {
      setMessage("Order not found");
      return;
    }

    setIsAssigning(true);
    setMessage("Assigning products...");

    try {
      const selectedItems = selectedProductIds.map((productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) throw new Error("Product not found");
        return { product, quantity: selectedQuantities[productId] ?? 1 };
      });

      const updatedOrder = await assignOrderProducts(order, selectedItems);

      dispatch({ type: "updateOrder", payload: updatedOrder });
      
      setMessage("Products assigned successfully!");
      setSelectedOrderId("");
      setSelectedQuantities({});
      setShowAssignForm(false);
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : "Failed to assign products"}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusColor = (status: Order["status"]) => {
    const colors: Record<Order["status"], string> = {
      no_task: "bg-slate-100 text-slate-700",
      waiting_assignment: "bg-amber-100 text-amber-700",
      product_assigned: "bg-sky-100 text-sky-700",
      waiting_shipment: "bg-purple-100 text-purple-700",
      belum_diserahkan: "bg-orange-100 text-orange-700",
      diserahkan: "bg-emerald-100 text-emerald-700",
      waiting: "bg-amber-100 text-amber-700",
      assigned: "bg-sky-100 text-sky-700",
      completed: "bg-emerald-100 text-emerald-700",
      frozen: "bg-rose-100 text-rose-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <Panel
      title="Task Assignment Dashboard"
      action={
        <button 
          onClick={() => setShowAssignForm(!showAssignForm)}
          className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add Task
        </button>
      }
    >
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <QueueSummary
          icon={<Clock3 size={18} />}
          label="Action needed"
          value={queueCounts.action}
          active={activeQueue === "action"}
          onClick={() => setActiveQueue("action")}
        />
        <QueueSummary
          icon={<PackageSearch size={18} />}
          label="In progress"
          value={queueCounts.progress}
          active={activeQueue === "progress"}
          onClick={() => setActiveQueue("progress")}
        />
        <QueueSummary
          icon={<Archive size={18} />}
          label="Archive"
          value={queueCounts.archive}
          active={activeQueue === "archive"}
          onClick={() => setActiveQueue("archive")}
        />
      </div>

      {showAssignForm && (
        <form onSubmit={handleAssignProducts} className="mb-6 rounded bg-slate-50 p-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Select Task (Waiting Assignment)">
              <select 
                className={inputClass} 
                required 
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                <option value="">Choose a task...</option>
                {waitingAssignmentOrders.map((order) => {
                  const member = members.find((m) => m.username === order.member);
                  return (
                    <option key={order.id} value={order.id}>
                      {member?.username || order.member} - {getOrderCode(order)}
                    </option>
                  );
                })}
              </select>
            </Field>

            <Field label="Select Products">
              <div className="space-y-2 border rounded p-2 bg-white max-h-52 overflow-y-auto">
                {products.length === 0 ? (
                  <p className="text-sm text-slate-500">No products available</p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="grid grid-cols-[auto_1fr_76px] items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(selectedQuantities[product.id] ?? 0) > 0}
                        onChange={(e) =>
                          setSelectedQuantities((current) => {
                            const next = { ...current };
                            if (e.target.checked) next[product.id] = Math.max(1, next[product.id] ?? 1);
                            else delete next[product.id];
                            return next;
                          })
                        }
                        className="rounded"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{product.code} - {product.name}</p>
                        <p className="text-xs text-slate-500">{formatRupiah(product.price)} · Stock {product.quantity}</p>
                      </div>
                      <input
                        className="rounded border border-slate-200 px-2 py-1 text-sm"
                        type="number"
                        min={1}
                        max={product.quantity}
                        disabled={(selectedQuantities[product.id] ?? 0) <= 0}
                        value={selectedQuantities[product.id] || ""}
                        onChange={(event) =>
                          setSelectedQuantities((current) => ({
                            ...current,
                            [product.id]: Math.max(1, Math.min(product.quantity, Number(event.target.value) || 1)),
                          }))
                        }
                        placeholder="Qty"
                      />
                    </div>
                  ))
                )}
              </div>
            </Field>
          </div>

          {message && (
            <p className={`rounded px-3 py-2 text-sm font-semibold ${
              message.includes("Error") || message.includes("Please")
                ? "bg-red-50 text-red-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {message}
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAssignForm(false);
                setSelectedQuantities({});
                setMessage("");
              }}
              className="flex-1 rounded border border-slate-200 px-3 py-2 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAssigning}
              className="flex-1 rounded bg-forest px-3 py-2 font-bold text-white hover:bg-forest/90 disabled:bg-slate-400"
            >
              {isAssigning ? "Assigning..." : "Save Task"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">{queueTitle(activeQueue)}</p>
          <p className="text-xs text-slate-500">{queueDescription(activeQueue)}</p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="h-10 w-full rounded border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-forest"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search task, member, product"
          />
        </div>
      </div>

      <div className="max-h-[640px] overflow-y-auto pr-1">
        <div className="grid gap-3">
        {visibleOrders.length === 0 ? (
          <p className="rounded border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No task records in this queue.
          </p>
        ) : (
          visibleOrders.map((order) => {
            const member = members.find((m) => m.username === order.member);
            const assignedProducts = order.assignedProducts?.length
              ? order.assignedProducts
              : order.productCode
                ? [{ code: order.productCode, name: order.productName ?? "Assigned product", quantity: order.quantity ?? 1, price: order.value, total: order.value, commission: order.commission, productId: order.productCode }]
                : [];
            
            return (
              <div
                key={order.id}
                className="rounded border border-slate-200 bg-white p-4 transition hover:border-forest/30 hover:shadow-sm"
              >
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr_0.9fr_0.9fr] lg:items-center">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Member</p>
                    <p className="mt-1 font-black text-slate-900">{member?.username || order.member || "Unknown"}</p>
                    <p className="mt-1 break-words text-xs font-semibold text-slate-500">{getOrderCode(order)}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Product</p>
                    <p className="mt-1 font-black text-slate-900">{assignedProducts.length ? `${assignedProducts.length} product(s)` : "Pending assignment"}</p>
                    <p className="mt-1 break-words text-xs text-slate-600">
                      {assignedProducts.map((product) => `${product.code} x${product.quantity}`).join(", ") || "No product assigned yet"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">Amount</p>
                    <p className="mt-1 font-black">{formatRupiah(order.value || 0)}</p>
                    <p className="text-xs text-emerald-700">Comm: {formatRupiah(order.commission || 0)}</p>
                  </div>

                  <div className="lg:text-right">
                    <p className="text-xs font-black uppercase text-slate-500">Date</p>
                    <p className="mt-1 text-sm font-black">{shortDate(order.createdAt)}</p>
                    <span className={`mt-2 inline-flex rounded px-2 py-1 text-xs font-black ${getStatusColor(order.status)}`}>
                      {getOrderStateLabel(getOrderState(order))}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>
    </Panel>
  );
}

function getQueueCounts(orders: Order[]) {
  return orders.reduce(
    (totals, order) => {
      const state = getOrderState(order);
      if (state === "waiting_assignment") totals.action += 1;
      else if (state === "diserahkan") totals.archive += 1;
      else totals.progress += 1;
      return totals;
    },
    { action: 0, progress: 0, archive: 0 },
  );
}

function queueTitle(queue: "action" | "progress" | "archive") {
  if (queue === "action") return "Action needed";
  if (queue === "progress") return "In progress";
  return "Archive";
}

function queueDescription(queue: "action" | "progress" | "archive") {
  if (queue === "action") return "Tasks waiting for an admin to assign products.";
  if (queue === "progress") return "Assigned tasks currently being handled by customers.";
  return "Completed and delivered task records.";
}

function QueueSummary({
  icon,
  label,
  value,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded border p-4 text-left transition ${
        active ? "border-forest bg-mint shadow-sm" : "border-slate-200 bg-white hover:border-forest/40 hover:bg-slate-50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded ${active ? "bg-forest text-white" : "bg-mint text-forest"}`}>
          {icon}
        </span>
        {active && <CheckCircle2 size={18} className="text-forest" />}
      </div>
      <p className="mt-4 text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </button>
  );
}
