import { CheckCircle2, ChevronLeft, ChevronRight, Filter, PackagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "../common";
import { assignOrderProduct } from "../../services/ordersService";
import { getOrderCode } from "../../services/orderCode";
import { getOrderState } from "../../services/orderStateService";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { formatRupiah, shortDate } from "../../utils";
import Filters from "./Filters";

const productPageSize = 5;
const rowPageSize = 10;

export default function OrderTable({ orders, members, products }: { orders: Order[]; members: Member[]; products: Product[] }) {
  const { dispatch } = useAppStore();
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [rowPage, setRowPage] = useState(0);
  const [activeQueue, setActiveQueue] = useState<"pending" | "completed">("pending");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const orderedRows = useMemo(
    () =>
      [...orders].sort((a, b) => {
        const left = new Date(a.createdAt.replace(" ", "T")).getTime();
        const right = new Date(b.createdAt.replace(" ", "T")).getTime();
        return right - left;
      }),
    [orders],
  );
  const pendingRows = orderedRows.filter((order) => getOrderState(order) !== "diserahkan");
  const completedRows = orderedRows.filter((order) => getOrderState(order) === "diserahkan");
  const visibleRows = activeQueue === "pending" ? pendingRows : completedRows;
  const totalRowPages = Math.max(1, Math.ceil(visibleRows.length / rowPageSize));
  const pagedRows = visibleRows.slice(rowPage * rowPageSize, rowPage * rowPageSize + rowPageSize);
  const startRow = visibleRows.length ? rowPage * rowPageSize + 1 : 0;
  const endRow = Math.min(visibleRows.length, (rowPage + 1) * rowPageSize);

  const productPages = Math.max(1, Math.ceil(products.length / productPageSize));
  const pagedProducts = products.slice(productPage * productPageSize, productPage * productPageSize + productPageSize);

  useEffect(() => {
    setRowPage(0);
  }, [activeQueue, orders.length]);

  const openProductModal = (order: Order) => {
    setTargetOrder(order);
    setSelectedProductId("");
    setProductPage(0);
    setMessage("");
  };

  const closeProductModal = () => {
    setTargetOrder(null);
    setSelectedProductId("");
    setProductPage(0);
  };

  const saveProductAssignment = async () => {
    if (!targetOrder) return;
    const selectedProduct = products.find((product) => product.id === selectedProductId);
    if (!selectedProduct) {
      setMessage("Please select a product first.");
      return;
    }
    if (selectedProduct.quantity <= 0) {
      setMessage("Selected product has no stock left.");
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const updatedOrder = await assignOrderProduct(targetOrder, selectedProduct);
      dispatch({ type: "updateOrder", payload: updatedOrder });
      setMessage("Product was added to the pending order.");
      closeProductModal();
      window.setTimeout(() => setMessage(""), 3500);
    } catch (error) {
      console.error("Failed to assign product:", error);
      setMessage(error instanceof Error ? error.message : "Firebase save failed. Check Firestore order rules.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Panel
        title="Order Intake Records"
        action={
          <button className="inline-flex items-center gap-2 rounded border border-slate-200 px-3 py-2 text-sm font-semibold">
            <Filter size={16} /> Filters
          </button>
        }
      >
        {message && (
          <p className={`mb-4 rounded px-3 py-2 text-sm font-bold ${message.includes("added") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </p>
        )}
        <Filters />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <OrderQueueButton
            label="Pending"
            description="Needs assignment or delivery completion"
            count={pendingRows.length}
            active={activeQueue === "pending"}
            tone="pending"
            onClick={() => setActiveQueue("pending")}
          />
          <OrderQueueButton
            label="Completed"
            description="Delivered orders archive"
            count={completedRows.length}
            active={activeQueue === "completed"}
            tone="completed"
            onClick={() => setActiveQueue("completed")}
          />
        </div>
        <div className="mt-4 overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-900">{activeQueue === "pending" ? "Pending order queue" : "Completed order archive"}</p>
              <p className="text-xs text-slate-500">Showing {startRow}-{endRow} of {visibleRows.length} records</p>
            </div>
            <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">10 per page</span>
          </div>

          <div className="hidden overflow-x-auto xl:block">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 bg-white text-left text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-white">
              <tr>
                <Th>Order Code</Th>
                <Th>Member</Th>
                <Th>User Balance</Th>
                <Th>Product</Th>
                <Th>Quantity</Th>
                <Th>Total Price</Th>
                <Th>Commission</Th>
                <Th>Status</Th>
                <Th>Task</Th>
                <Th>Date</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.length ? (
                pagedRows.map((order) => {
                  const member = members.find((item) => item.id === order.memberId || item.username === order.member);
                  const assignedProducts = order.assignedProducts?.length
                    ? order.assignedProducts
                    : order.productName
                      ? [{ name: order.productName, code: order.productCode ?? "", quantity: order.quantity ?? 1 }]
                      : [];
                  const orderState = getOrderState(order);
                  const isCompleted = orderState === "diserahkan";
                  const hasProduct = assignedProducts.length > 0;
                  const taskLabel = isCompleted ? "Completed" : hasProduct ? "Pending delivery" : "Pending assignment";

                  return (
                    <tr key={order.id} className="group align-top transition hover:bg-slate-50">
                      <Td>
                        <span className="block max-w-[150px] break-words font-black text-forest">{getOrderCode(order)}</span>
                      </Td>
                      <Td>
                        <OrderMemberCell order={order} member={member} />
                      </Td>
                      <Td>{formatRupiah(member?.balance ?? 0)}</Td>
                      <Td>
                        {hasProduct ? (
                          <div className="grid gap-1">
                            {assignedProducts.map((product) => (
                              <span key={`${order.id}-${product.code}-${product.name}`} className="font-semibold text-slate-800">
                                {product.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Waiting product</span>
                        )}
                      </Td>
                      <Td>{order.quantity ?? 0}</Td>
                      <Td>{formatRupiah(order.value ?? 0)}</Td>
                      <Td>{formatRupiah(order.commission ?? 0)}</Td>
                      <Td>
                        <span className={`inline-flex rounded px-2 py-1 text-xs font-black ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {isCompleted ? "Completed" : "Pending"}
                        </span>
                      </Td>
                      <Td>{taskLabel}</Td>
                      <Td>{shortDate(order.createdAt)}</Td>
                      <Td>
                        {!hasProduct && !isCompleted ? (
                          <button
                            className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
                            onClick={() => openProductModal(order)}
                          >
                            <PackagePlus size={14} /> Add Product
                          </button>
                        ) : hasProduct && !isCompleted ? (
                          <span className="inline-flex max-w-[140px] rounded bg-amber-100 px-3 py-2 text-xs font-black leading-4 text-amber-700">
                            Product selected, waiting for completion
                          </span>
                        ) : (
                          <span className="inline-flex rounded bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                            Completed
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-6 text-center text-sm text-slate-500">
                    {activeQueue === "pending" ? "No pending order records in this admin scope yet." : "No completed order records in this admin scope yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <div className="grid gap-3 p-3 xl:hidden">
            {pagedRows.length ? (
              pagedRows.map((order) => {
                const member = members.find((item) => item.id === order.memberId || item.username === order.member);
                const assignedProducts = order.assignedProducts?.length
                  ? order.assignedProducts
                  : order.productName
                    ? [{ name: order.productName, code: order.productCode ?? "", quantity: order.quantity ?? 1 }]
                    : [];
                const orderState = getOrderState(order);
                const isCompleted = orderState === "diserahkan";
                const hasProduct = assignedProducts.length > 0;
                const taskLabel = isCompleted ? "Completed" : hasProduct ? "Pending delivery" : "Pending assignment";

                return (
                  <article key={order.id} className="rounded border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="break-words text-sm font-black text-forest">{getOrderCode(order)}</p>
                        <OrderMemberCell order={order} member={member} />
                      </div>
                      <span className={`shrink-0 rounded px-2 py-1 text-xs font-black ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {isCompleted ? "Completed" : "Pending"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MobileOrderMetric label="User balance" value={formatRupiah(member?.balance ?? 0)} />
                      <MobileOrderMetric label="Total price" value={formatRupiah(order.value ?? 0)} />
                      <MobileOrderMetric label="Commission" value={formatRupiah(order.commission ?? 0)} />
                      <MobileOrderMetric label="Quantity" value={String(order.quantity ?? 0)} />
                      <MobileOrderMetric label="Task" value={taskLabel} wide />
                      <MobileOrderMetric label="Date" value={shortDate(order.createdAt)} wide />
                    </div>
                    <div className="mt-4 rounded bg-slate-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Product</p>
                      {hasProduct ? (
                        <div className="mt-1 grid gap-1">
                          {assignedProducts.map((product) => (
                            <p key={`${order.id}-${product.code}-${product.name}`} className="text-sm font-black text-slate-900">{product.name}</p>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-slate-400">Waiting product</p>
                      )}
                    </div>
                    <div className="mt-4">
                      <OrderAction hasProduct={hasProduct} isCompleted={isCompleted} onAdd={() => openProductModal(order)} />
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded bg-slate-50 p-6 text-center text-sm text-slate-500">
                {activeQueue === "pending" ? "No pending order records in this admin scope yet." : "No completed order records in this admin scope yet."}
              </p>
            )}
          </div>

          <TablePagination page={rowPage} totalPages={totalRowPages} onPageChange={setRowPage} />
        </div>
      </Panel>

      {targetOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4">
          <div className="w-full max-w-2xl rounded bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Add Product to Order</h3>
                <p className="text-xs font-semibold text-slate-500">{getOrderCode(targetOrder)}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100" onClick={closeProductModal}>
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              {products.length ? (
                <div className="grid gap-3">
                  {pagedProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className={`grid grid-cols-[64px_1fr_auto] items-center gap-3 rounded border p-3 text-left transition hover:border-forest ${selectedProductId === product.id ? "border-forest bg-mint" : "border-slate-200"}`}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <img className="h-16 w-16 rounded object-cover" src={product.image} alt={product.name} />
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-800">{product.name}</span>
                        <span className="block text-xs font-semibold text-slate-500">{product.code} · Stock {product.quantity}</span>
                      </span>
                      <span className="text-right text-sm font-black text-forest">{formatRupiah(product.price)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded bg-slate-50 p-5 text-center text-sm text-slate-500">No products available. Add products in Catalog first.</p>
              )}

              <div className="mt-4 flex items-center justify-between">
                <button
                  className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-sm font-bold disabled:text-slate-300"
                  disabled={productPage === 0}
                  onClick={() => setProductPage((page) => Math.max(0, page - 1))}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Page {productPage + 1} of {productPages}
                </span>
                <button
                  className="inline-flex items-center gap-1 rounded border border-slate-200 px-3 py-2 text-sm font-bold disabled:text-slate-300"
                  disabled={productPage >= productPages - 1}
                  onClick={() => setProductPage((page) => Math.min(productPages - 1, page + 1))}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button className="flex-1 rounded border border-slate-200 px-4 py-3 font-black hover:bg-slate-50" onClick={closeProductModal}>
                Cancel
              </button>
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 rounded bg-forest px-4 py-3 font-black text-white disabled:bg-slate-400"
                disabled={isSaving || !selectedProductId}
                onClick={saveProductAssignment}
              >
                <CheckCircle2 size={18} /> {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OrderQueueButton({
  label,
  description,
  count,
  active,
  tone,
  onClick,
}: {
  label: string;
  description: string;
  count: number;
  active: boolean;
  tone: "pending" | "completed";
  onClick: () => void;
}) {
  const styles = {
    pending: active ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:bg-amber-50",
    completed: active ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-emerald-50",
  }[tone];

  return (
    <button className={`flex items-center justify-between rounded border px-4 py-3 text-left transition ${styles}`} onClick={onClick}>
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-1 block text-xs opacity-75">{description}</span>
      </span>
      <span className="rounded bg-white px-2.5 py-1 text-sm font-black shadow-sm">{count}</span>
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border-r border-slate-700 px-4 py-3 font-black last:border-r-0">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-100 border-r border-slate-100 px-4 py-4 align-top last:border-r-0">{children}</td>;
}

function OrderMemberCell({ order, member }: { order: Order; member?: Member }) {
  return (
    <div className="min-w-0">
      <p className="font-black text-slate-900">{member?.username ?? order.member}</p>
      <p className="text-xs font-semibold text-slate-500">Username: {order.member}</p>
      {member?.phone && <p className="text-xs text-coral">{member.phone}</p>}
      {member?.referredBy && <p className="text-xs text-slate-400">{member.referredBy}</p>}
    </div>
  );
}

function OrderAction({ hasProduct, isCompleted, onAdd }: { hasProduct: boolean; isCompleted: boolean; onAdd: () => void }) {
  if (!hasProduct && !isCompleted) {
    return (
      <button className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700" onClick={onAdd}>
        <PackagePlus size={14} /> Add Product
      </button>
    );
  }

  if (hasProduct && !isCompleted) {
    return (
      <span className="inline-flex max-w-[180px] rounded bg-amber-100 px-3 py-2 text-xs font-black leading-4 text-amber-700">
        Product selected, waiting for completion
      </span>
    );
  }

  return <span className="inline-flex rounded bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">Completed</span>;
}

function MobileOrderMetric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`rounded bg-slate-50 p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function TablePagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-slate-500">Page {page + 1} of {totalPages}</p>
      <div className="flex gap-2">
        <button className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 disabled:text-slate-300 sm:flex-none" disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
          Previous
        </button>
        <button className="flex-1 rounded bg-forest px-3 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:flex-none" disabled={page >= totalPages - 1} onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}>
          Next
        </button>
      </div>
    </div>
  );
}
