import { CheckCircle2, ChevronLeft, ChevronRight, Filter, PackagePlus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Panel } from "../common";
import { assignOrderProduct, assignOrderProducts, updateOrderStatus } from "../../services/ordersService";
import { getOrderCode } from "../../services/orderCode";
import { getOrderState } from "../../services/orderStateService";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { formatRupiah, shortDate } from "../../utils";
import AmountSortControls, { type AmountSort } from "./AmountSortControls";
import Filters from "./Filters";

const productPageSize = 5;
const rowPageSize = 10;
const taskTarget = 15;

type ProductSort = "none" | "price-high" | "price-low";

export default function OrderTable({ orders, members, products }: { orders: Order[]; members: Member[]; products: Product[] }) {
  const { dispatch } = useAppStore();
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productPage, setProductPage] = useState(0);
  const [rowPage, setRowPage] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [amountSort, setAmountSort] = useState<AmountSort>("none");
  const [showFilters, setShowFilters] = useState(true);
  const [productSort, setProductSort] = useState<ProductSort>("none");

  const orderedRows = useMemo(() => {
    return [...orders].sort((a, b) => {
      if (amountSort !== "none") {
        const difference = getOrderAmount(a) - getOrderAmount(b);
        return amountSort === "asc" ? difference : -difference;
      }

      const left = new Date(a.createdAt.replace(" ", "T")).getTime();
      const right = new Date(b.createdAt.replace(" ", "T")).getTime();
      return right - left;
    });
  }, [amountSort, orders]);
  const visibleRows = orderedRows;
  const totalRowPages = Math.max(1, Math.ceil(visibleRows.length / rowPageSize));
  const pagedRows = visibleRows.slice(rowPage * rowPageSize, rowPage * rowPageSize + rowPageSize);
  const startRow = visibleRows.length ? rowPage * rowPageSize + 1 : 0;
  const endRow = Math.min(visibleRows.length, (rowPage + 1) * rowPageSize);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    if (productSort === "price-high") {
      return sorted.sort((a, b) => b.price - a.price);
    } else if (productSort === "price-low") {
      return sorted.sort((a, b) => a.price - b.price);
    }
    return sorted;
  }, [products, productSort]);

  const productPages = Math.max(1, Math.ceil(sortedProducts.length / productPageSize));
  const pagedProducts = sortedProducts.slice(productPage * productPageSize, productPage * productPageSize + productPageSize);

  useEffect(() => {
    setRowPage(0);
  }, [amountSort, orders.length]);

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
    const selectedProduct = sortedProducts.find((product) => product.id === selectedProductId);
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
      const isChangingCustomerRequest =
        getOrderState(targetOrder) === "waiting_assignment" &&
        Boolean(targetOrder.productName || targetOrder.assignedProducts?.length);
      const updatedOrder = await assignOrderProduct(targetOrder, selectedProduct, {
        requiresCustomerApproval: isChangingCustomerRequest,
      });
      dispatch({ type: "updateOrder", payload: updatedOrder });
      setMessage(isChangingCustomerRequest ? "Product was changed. Customer must accept or reject the new product." : "Product was added to the pending order.");
      closeProductModal();
      window.setTimeout(() => setMessage(""), 3500);
    } catch (error) {
      console.error("Failed to assign product:", error);
      setMessage(error instanceof Error ? error.message : "Firebase save failed. Check Firestore order rules.");
    } finally {
      setIsSaving(false);
    }
  };

  const approveRequestedProduct = async (order: Order) => {
    const assignedProducts = order.assignedProducts?.length
      ? order.assignedProducts
      : order.productCode
        ? [{ productId: order.productCode, code: order.productCode, name: order.productName ?? "Selected product", quantity: order.quantity ?? 1 }]
        : [];

    const selectedItems = assignedProducts.map((assignedProduct) => {
      const product = products.find((item) => item.id === assignedProduct.productId || item.code === assignedProduct.code);
      if (!product) throw new Error(`Product ${assignedProduct.code || assignedProduct.name} is no longer in the catalog.`);
      return { product, quantity: assignedProduct.quantity ?? 1 };
    });

    if (!selectedItems.length) {
      openProductModal(order);
      return;
    }

    setIsSaving(true);
    setMessage("");
    try {
      const updatedOrder = await assignOrderProducts(order, selectedItems);
      dispatch({ type: "updateOrder", payload: updatedOrder });
      setMessage("Product request approved. Customer can now send the order.");
      window.setTimeout(() => setMessage(""), 3500);
    } catch (error) {
      console.error("Failed to approve product request:", error);
      setMessage(error instanceof Error ? error.message : "Firebase save failed. Check Firestore order rules.");
    } finally {
      setIsSaving(false);
    }
  };

  const rejectRequestedProduct = async (order: Order) => {
    setIsSaving(true);
    setMessage("");
    try {
      const updatedOrder = await updateOrderStatus(order, "rejected", {
        completedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      });
      dispatch({ type: "updateOrder", payload: updatedOrder });
      setMessage("Product request rejected.");
      window.setTimeout(() => setMessage(""), 3500);
    } catch (error) {
      console.error("Failed to reject product request:", error);
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
          <button
            className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-sm font-semibold transition ${
              showFilters ? "border-forest bg-mint text-forest" : "border-slate-200 bg-white text-slate-700 hover:border-forest/40 hover:text-forest"
            }`}
            onClick={() => setShowFilters((current) => !current)}
          >
            <Filter size={16} /> Filters
          </button>
        }
      >
        {message && (
          <p className={`mb-4 rounded px-3 py-2 text-sm font-bold ${message.includes("added") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </p>
        )}
        {showFilters && (
          <Filters>
            <AmountSortControls value={amountSort} onChange={setAmountSort} label="price" />
          </Filters>
        )}
        <div className="mt-4 overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-slate-900">Order records</p>
              <p className="text-xs text-slate-500">Showing {startRow}-{endRow} of {visibleRows.length} records</p>
            </div>
            <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">10 per page</span>
          </div>

          <div className="overflow-x-auto">
          <table className="w-full min-w-[1450px] border-separate border-spacing-0 bg-white text-left text-[13px]">
            <thead className="bg-slate-900 text-left text-xs uppercase text-white">
              <tr>
                <Th>Order Code</Th>
                <Th>User</Th>
                <Th>Name</Th>
                <Th>User Balance</Th>
                <Th>Product</Th>
                <Th>Total Price</Th>
                <Th>Commission</Th>
                <Th>Balance Shortage</Th>
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
                  const isRejected = orderState === "rejected";
                  const hasProduct = assignedProducts.length > 0;
                  const needsApproval = orderState === "waiting_assignment" && hasProduct;
                  const userBalance = member?.balance ?? 0;
                  const requiredBalance = order.requiredBalance ?? order.value ?? 0;
                  const shortage = Math.max(0, requiredBalance - userBalance);
                  const taskProgress = getMemberTaskProgress(order, orderedRows);

                  return (
                    <tr key={order.id} className="group align-top transition hover:bg-slate-50">
                      <Td>
                        <span className="block max-w-[150px] break-words font-black text-forest">{getOrderCode(order)}</span>
                      </Td>
                      <Td>
                        <span className="block max-w-[130px] break-words font-semibold text-slate-900">{member?.phone || order.member}</span>
                      </Td>
                      <Td>
                        <OrderMemberCell order={order} member={member} />
                      </Td>
                      <Td>{formatRupiah(userBalance)}</Td>
                      <Td>
                        {hasProduct ? (
                          <div className="grid gap-1">
                            {needsApproval && (
                              <span className="mb-1 inline-flex w-fit rounded bg-amber-50 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                                User requested this product
                              </span>
                            )}
                            {assignedProducts.map((product) => (
                              <span key={`${order.id}-${product.code}-${product.name}`} className="max-w-[270px] whitespace-pre-line font-semibold leading-5 text-slate-800">
                                {product.name}
                                <span className="block text-xs font-medium text-slate-500">Product price: {formatRupiah(getAssignedProductTotal(product))}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">Waiting product</span>
                        )}
                      </Td>
                      <Td>{formatRupiah(order.value ?? 0)}</Td>
                      <Td>{formatRupiah(order.commission ?? 0)}</Td>
                      <Td>
                        {shortage > 0 ? (
                          <span className="font-black text-red-600">(-{formatRupiah(shortage).replace(/^Rp\s?/, "Rp")})</span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </Td>
                      <Td>
                        <span className={`inline-flex rounded px-2 py-1 text-xs font-black ${isCompleted ? "bg-emerald-100 text-emerald-700" : isRejected ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                          {isCompleted ? "Completed" : isRejected ? "Rejected" : "Pending"}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-black text-slate-900">Task {taskProgress} / {taskTarget}</span>
                      </Td>
                      <Td>{shortDate(order.createdAt)}</Td>
                      <Td>
                        {needsApproval ? (
                          <div className="flex flex-col gap-2">
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded bg-forest px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:bg-slate-300"
                              disabled={isSaving}
                              onClick={() => approveRequestedProduct(order)}
                            >
                              <CheckCircle2 size={14} /> Accept
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700 disabled:bg-slate-300"
                              disabled={isSaving}
                              onClick={() => openProductModal(order)}
                            >
                              <PackagePlus size={14} /> Change Product
                            </button>
                            <button
                              className="inline-flex items-center justify-center gap-1 rounded bg-rose-600 px-3 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:bg-slate-300"
                              disabled={isSaving}
                              onClick={() => rejectRequestedProduct(order)}
                            >
                              <X size={14} /> Reject
                            </button>
                          </div>
                        ) : !hasProduct && !isCompleted && !isRejected ? (
                          <button
                            className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
                            onClick={() => openProductModal(order)}
                          >
                            <PackagePlus size={14} /> Add Product
                          </button>
                        ) : hasProduct && !isCompleted && !isRejected ? (
                          <span className="inline-flex max-w-[140px] rounded bg-amber-100 px-3 py-2 text-xs font-black leading-4 text-amber-700">
                            Product selected, waiting for completion
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex rounded bg-rose-100 px-3 py-2 text-xs font-black text-rose-700">
                            Rejected
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
                  <td colSpan={12} className="p-6 text-center text-sm text-slate-500">
                    No order records in this admin scope yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <TablePagination page={rowPage} totalPages={totalRowPages} onPageChange={setRowPage} />
        </div>
      </Panel>

      {targetOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4">
          <div className="w-full max-w-2xl rounded bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black">{targetOrder.productName || targetOrder.assignedProducts?.length ? "Change Product Request" : "Add Product to Order"}</h3>
                <p className="text-xs font-semibold text-slate-500">{getOrderCode(targetOrder)}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100" onClick={closeProductModal}>
                <X size={18} />
              </button>
            </div>

            <div className="border-b border-slate-100 px-5 py-3">
              <label className="text-xs font-bold text-slate-600">Sort by price</label>
              <select
                value={productSort}
                onChange={(e) => {
                  setProductSort(e.target.value as ProductSort);
                  setProductPage(0);
                }}
                className="mt-2 w-full rounded border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900"
              >
                <option value="none">Default order</option>
                <option value="price-high">Highest price to lowest</option>
                <option value="price-low">Lowest price to highest</option>
              </select>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              {sortedProducts.length ? (
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
                        <span className="block text-xs font-semibold text-slate-500">
                          {product.code} · {product.quantity > 0 ? "Available" : "Unavailable"}
                        </span>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border-r border-slate-700 px-4 py-3 font-black last:border-r-0">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-200 border-r border-slate-100 px-3 py-3 align-top last:border-r-0">{children}</td>;
}

function OrderMemberCell({ order, member }: { order: Order; member?: Member }) {
  return (
    <div className="min-w-0">
      <p className="max-w-[150px] break-words font-black text-slate-900">{member?.username ?? order.member}</p>
      <p className="text-xs font-semibold text-slate-500">ID: {member?.id ?? "-"}</p>
      {member?.referredBy && <p className="text-xs text-slate-400">{member.referredBy}</p>}
    </div>
  );
}

function getAssignedProductTotal(product: { total?: number; price?: number; quantity?: number }) {
  if (typeof product.total === "number") return product.total;
  if (typeof product.price === "number") return product.price * (product.quantity ?? 1);
  return 0;
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
