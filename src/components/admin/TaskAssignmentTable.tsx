import { Plus } from "lucide-react";
import { useState } from "react";
import { Field, inputClass, Panel } from "../common";
import { formatRupiah, shortDate } from "../../utils";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { assignOrderProducts } from "../../services/ordersService";
import { getOrderCode } from "../../services/orderCode";

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

  // Filter orders that are waiting for assignment
  const waitingAssignmentOrders = orders.filter((order) => order.status === "waiting_assignment" || order.status === "waiting");

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
          <Plus size={16} /> Add Product
        </button>
      }
    >
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
              {isAssigning ? "Assigning..." : "Save Products"}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <p className="rounded bg-slate-50 p-4 text-sm text-slate-500">No task assignments yet.</p>
        ) : (
          orders.map((order) => {
            const member = members.find((m) => m.username === order.member);
            const assignedProducts = order.assignedProducts?.length
              ? order.assignedProducts
              : order.productCode
                ? [{ code: order.productCode, name: order.productName ?? "Assigned product", quantity: order.quantity ?? 1, price: order.value, total: order.value, commission: order.commission, productId: order.productCode }]
                : [];
            
            return (
              <div
                key={order.id}
                className="rounded border border-slate-200 p-4 grid gap-4 md:grid-cols-[auto_1fr_auto_auto_auto] md:items-center"
              >
                <div className="md:col-span-1">
                  <p className="text-xs text-slate-500 uppercase">Member</p>
                  <p className="font-bold">{member?.username || "Unknown"}</p>
                  <p className="text-xs text-slate-600">{getOrderCode(order)}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Product</p>
                  <p className="font-bold">{assignedProducts.length ? `${assignedProducts.length} product(s)` : "Pending..."}</p>
                  <p className="text-xs text-slate-600">
                    {assignedProducts.map((product) => `${product.code} x${product.quantity}`).join(", ") || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Amount</p>
                  <p className="font-bold">{formatRupiah(order.value || 0)}</p>
                  <p className="text-xs text-emerald-700">Comm: {formatRupiah(order.commission || 0)}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 uppercase">Status</p>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase">Date</p>
                  <p className="text-sm font-bold">{shortDate(order.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
