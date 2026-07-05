import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Field, inputClass, Panel } from "../common";
import { formatRupiah, shortDate } from "../../utils";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { assignOrderProducts } from "../../services/ordersService";
import { getOrderCode } from "../../services/orderCode";
import { getOrderState, getOrderStateLabel, type OrderState } from "../../services/orderStateService";
import AmountSortControls, { type AmountSort } from "./AmountSortControls";

interface TaskAssignmentTableProps {
  orders: Order[];
  members: Member[];
  products: Product[];
}

const taskTarget = 15;
const rowPageSize = 10;

export default function TaskAssignmentTable({ orders, members, products }: TaskAssignmentTableProps) {
  const { dispatch } = useAppStore();
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [rowPage, setRowPage] = useState(0);
  const [amountSort, setAmountSort] = useState<AmountSort>("none");

  const openAssignFormForOrder = (orderId?: string) => {
    setShowAssignForm(true);
    setSelectedOrderId(orderId ?? "");
    setMessage("");
  };

  // Filter orders that are waiting for assignment
  const waitingAssignmentOrders = orders.filter((order) => {
    const state = getOrderState(order);
    const hasSelectedProduct = Boolean(order.productName || order.assignedProducts?.length);
    return state === "waiting_assignment" && !hasSelectedProduct;
  });
  const visibleOrders = useMemo(() => {
    const filteredOrders = orders.filter((order) => {
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

    return filteredOrders.sort((left, right) => {
      if (amountSort !== "none") {
        const difference = getOrderAmount(left) - getOrderAmount(right);
        return amountSort === "asc" ? difference : -difference;
      }

      return new Date(right.createdAt.replace(" ", "T")).getTime() - new Date(left.createdAt.replace(" ", "T")).getTime();
    });
  }, [amountSort, members, orders, query]);
  const totalRowPages = Math.max(1, Math.ceil(visibleOrders.length / rowPageSize));
  const pagedOrders = visibleOrders.slice(rowPage * rowPageSize, rowPage * rowPageSize + rowPageSize);
  const startRow = visibleOrders.length ? rowPage * rowPageSize + 1 : 0;
  const endRow = Math.min(visibleOrders.length, (rowPage + 1) * rowPageSize);

  useEffect(() => {
    setRowPage(0);
  }, [amountSort, query, orders.length]);

  useEffect(() => {
    if (rowPage > totalRowPages - 1) setRowPage(totalRowPages - 1);
  }, [rowPage, totalRowPages]);

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
      rejected: "bg-rose-100 text-rose-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  return (
    <Panel
      title="Task Assignment Dashboard"
      action={
        <button 
          onClick={() => (showAssignForm ? setShowAssignForm(false) : openAssignFormForOrder())}
          className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Add Task
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
                  <p className="text-sm text-slate-500">Tidak ada produk yang tersedia</p>
                ) : (
                    products.map((product) => {
                      const isAvailable = product.quantity > 0;

                      return (
                        <div
                          key={product.id}
                          className={`grid grid-cols-[auto_1fr] items-center gap-2 text-sm ${
                            !isAvailable ? "opacity-60" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!isAvailable}
                            checked={isAvailable && (selectedQuantities[product.id] ?? 0) > 0}
                            onChange={(e) =>
                              setSelectedQuantities((current) => {
                                const next = { ...current };

                                if (!isAvailable) {
                                  delete next[product.id];
                                  return next;
                                }

                                if (e.target.checked) next[product.id] = Math.max(1, next[product.id] ?? 1);
                                else delete next[product.id];

                                return next;
                              })
                            }
                            className="rounded disabled:cursor-not-allowed"
                          />

                          <div className="min-w-0">
                            <p className="truncate font-semibold">{product.code} - {product.name}</p>
                            <p className={`text-xs ${isAvailable ? "text-slate-500" : "font-bold text-rose-600"}`}>
                              {formatRupiah(product.price)} · {isAvailable ? "Available" : "Unavailable"}
                            </p>
                          </div>
                        </div>
                      );
                    })
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
              {isAssigning ? "Menugaskan..." : "Simpan Tugas"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-900">Catatan tugas</p>
          <p className="text-xs text-slate-500">
            Menampilkan {startRow}-{endRow} of {visibleOrders.length} catatan tugas.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-2xl sm:flex-row sm:items-center sm:justify-end">
          <AmountSortControls value={amountSort} onChange={setAmountSort} label="price" />
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
      </div>

      <div className="max-h-[640px] overflow-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[1660px] table-fixed border-separate border-spacing-0 text-left text-[13px]">
          <colgroup>
            <col className="w-[190px]" />
            <col className="w-[140px]" />
            <col className="w-[170px]" />
            <col className="w-[130px]" />
            <col className="w-[340px]" />
            <col className="w-[130px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
            <col className="w-[110px]" />
            <col className="w-[130px]" />
            <col className="w-[120px]" />
            <col className="w-[170px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-white">
            <tr>
              <TaskTh>Kode</TaskTh>
              <TaskTh>Pengguna</TaskTh>
              <TaskTh>Nama</TaskTh>
              <TaskTh>Saldo Pengguna</TaskTh>
              <TaskTh>Produk</TaskTh>
              <TaskTh>Total Harga</TaskTh>
              <TaskTh>Komisi</TaskTh>
              <TaskTh>Kekurangan Saldo</TaskTh>
              <TaskTh>Status</TaskTh>
              <TaskTh>Tugas</TaskTh>
              <TaskTh>Tanggal</TaskTh>
              <TaskTh>Tindakan</TaskTh>
            </tr>
          </thead>
          <tbody>
        {pagedOrders.length === 0 ? (
          <tr>
            <td colSpan={12} className="p-6 text-center text-sm text-slate-500">
             Tidak ada catatan tugas yang ditemukan.
            </td>
          </tr>
        ) : (
          pagedOrders.map((order) => {
            const member = members.find((m) => m.username === order.member);
            const assignedProducts = order.assignedProducts?.length
              ? order.assignedProducts
              : order.productCode
                ? [{ code: order.productCode, name: order.productName ?? "Assigned product", quantity: order.quantity ?? 1, price: order.value, total: order.value, commission: order.commission, productId: order.productCode }]
                : [];
            const totalPrice = order.value || assignedProducts.reduce((sum, product) => sum + (product.total || product.price * product.quantity || 0), 0);
            const userBalance = member?.balance ?? 0;
            const shortage = Math.max(0, (order.requiredBalance ?? totalPrice) - userBalance);
            const state = getOrderState(order);
            const hasProduct = assignedProducts.length > 0;
            const taskProgress = getMemberTaskProgress(order, orders);
            
            return (
              <tr key={order.id} className="align-top transition hover:bg-slate-50">
                <TaskTd>
                    <span className="block break-words font-black leading-5 text-forest">{getOrderCode(order)}</span>
                </TaskTd>
                <TaskTd>
                    <span className="block break-words font-semibold text-slate-900">{member?.phone || order.member || "-"}</span>
                </TaskTd>
                <TaskTd>
                  <p className="font-black text-slate-900">{member?.username || order.member || "Unknown"}</p>
                  <p className="text-xs text-slate-500">ID: {member?.id ?? "-"}</p>
                </TaskTd>
                <TaskTd>{formatRupiah(userBalance)}</TaskTd>
                <TaskTd>
                  {hasProduct ? (
                    <span className="block whitespace-pre-line break-words font-semibold leading-5 text-slate-800">
                      {assignedProducts.map((product) => `${product.name}\n${product.code}`).join("\n")}
                    </span>
                  ) : (
                    <span className="text-slate-400">Penugasan tertunda</span>
                  )}
                </TaskTd>
                <TaskTd>{formatRupiah(totalPrice)}</TaskTd>
                <TaskTd>{formatRupiah(order.commission || 0)}</TaskTd>
                <TaskTd>
                  {shortage > 0 ? <span className="font-black text-red-600">(-{formatRupiah(shortage).replace(/^Rp\s?/, "Rp")})</span> : <span className="text-slate-500">-</span>}
                </TaskTd>
                <TaskTd>
                  <span className={`inline-flex rounded px-2 py-1 text-xs font-black ${getStatusColor(order.status)}`}>
                    {state === "diserahkan" ? "Completed" : state === "rejected" ? "Rejected" : "Pending"}
                  </span>
                </TaskTd>
                <TaskTd>
                  <span className="font-black text-slate-900">Task {taskProgress} / {taskTarget}</span>
                  <span className="block text-xs text-slate-500">{getOrderStateLabel(state)}</span>
                </TaskTd>
                <TaskTd>{shortDate(order.createdAt)}</TaskTd>
                <TaskTd>
                  {state === "waiting_assignment" && !hasProduct ? (
                    <button
                      className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
                      onClick={() => openAssignFormForOrder(order.id)}
                    >
                      <Plus size={14} /> Tambahkan Tugas
                    </button>
                  ) : state === "waiting_assignment" && hasProduct ? (
                    <span className="inline-flex w-full items-center justify-center rounded bg-amber-100 px-3 py-2 text-center text-xs font-black leading-4 text-amber-700">
                      Menunggu persetujuan
                    </span>
                  ) : state === "diserahkan" ? (
                    <span className="inline-flex w-full items-center justify-center rounded bg-emerald-100 px-3 py-2 text-center text-xs font-black leading-4 text-emerald-700">Product Selected</span>
                  ) : state === "rejected" ? (
                    <span className="inline-flex w-full items-center justify-center rounded bg-rose-100 px-3 py-2 text-center text-xs font-black text-rose-700">Rejected</span>
                  ) : (
                    <span className="inline-flex w-full items-center justify-center rounded bg-amber-100 px-3 py-2 text-center text-xs font-black leading-4 text-amber-700">
                      Produk telah dipilih, menunggu penyelesaian
                    </span>
                  )}
                </TaskTd>
              </tr>
            );
          })
        )}
          </tbody>
        </table>
      </div>
      <TablePagination page={rowPage} totalPages={totalRowPages} onPageChange={setRowPage} />
    </Panel>
  );
}

function getMemberTaskProgress(order: Order, orders: Order[]) {
  const memberKey = order.memberId || order.member;
  const memberOrders = orders
    .filter((item) => (item.memberId || item.member) === memberKey)
    .sort((left, right) => new Date(left.createdAt.replace(" ", "T")).getTime() - new Date(right.createdAt.replace(" ", "T")).getTime());
  const index = memberOrders.findIndex((item) => item.id === order.id);
  return Math.min(taskTarget, Math.max(1, index + 1));
}

function getOrderAmount(order: Order) {
  if (typeof order.value === "number" && order.value > 0) return order.value;
  return order.assignedProducts?.reduce((sum, product) => sum + getAssignedProductTotal(product), 0) ?? 0;
}

function getAssignedProductTotal(product: { total?: number; price?: number; quantity?: number }) {
  if (typeof product.total === "number") return product.total;
  if (typeof product.price === "number") return product.price * (product.quantity ?? 1);
  return 0;
}

function TaskTh({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap border-r border-slate-700 px-3 py-3 font-black last:border-r-0">{children}</th>;
}

function TaskTd({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-200 border-r border-slate-100 px-3 py-3 align-top last:border-r-0">{children}</td>;
}

function TablePagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-x border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-slate-500">
        Halaman {page + 1} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 disabled:text-slate-300 sm:flex-none"
          disabled={page === 0}
          onClick={() => onPageChange(Math.max(0, page - 1))}
        >
         Sebelumnya
        </button>
        <button
          className="flex-1 rounded bg-forest px-3 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:flex-none"
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
