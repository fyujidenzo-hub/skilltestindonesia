import { CheckCircle2, ChevronLeft, ChevronRight, Filter, PackagePlus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Panel } from "../common";
import { assignOrderProduct } from "../../services/ordersService";
import { getOrderCode } from "../../services/orderCode";
import { getOrderState } from "../../services/orderStateService";
import { useAppStore } from "../../store/AppStore";
import type { Member, Order, Product } from "../../types";
import { formatRupiah, shortDate } from "../../utils";
import Filters from "./Filters";

const pageSize = 5;

export default function OrderTable({ orders, members, products }: { orders: Order[]; members: Member[]; products: Product[] }) {
  const { dispatch } = useAppStore();
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productPage, setProductPage] = useState(0);
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

  const productPages = Math.max(1, Math.ceil(products.length / pageSize));
  const pagedProducts = products.slice(productPage * pageSize, productPage * pageSize + pageSize);

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
      setMessage("Produk berhasil ditambahkan ke pesanan.");
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
          <p className={`mb-4 rounded px-3 py-2 text-sm font-bold ${message.includes("berhasil") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {message}
          </p>
        )}
        <Filters />
        <div className="mt-4 overflow-x-auto rounded border border-slate-200">
          <table className="min-w-[1180px] w-full border-collapse bg-white text-sm">
            <thead className="bg-slate-900 text-left text-xs uppercase text-white">
              <tr>
                <Th>Order Code</Th>
                <Th>User</Th>
                <Th>Customer Name</Th>
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
              {orderedRows.length ? (
                orderedRows.map((order) => {
                  const member = members.find((item) => item.id === order.memberId || item.username === order.member);
                  const assignedProducts = order.assignedProducts?.length
                    ? order.assignedProducts
                    : order.productName
                      ? [{ name: order.productName, code: order.productCode ?? "", quantity: order.quantity ?? 1 }]
                      : [];
                  const orderState = getOrderState(order);
                  const isCompleted = orderState === "diserahkan";
                  const hasProduct = assignedProducts.length > 0;

                  return (
                    <tr key={order.id} className="border-t border-slate-200 align-top">
                      <Td>{getOrderCode(order)}</Td>
                      <Td>{order.member}</Td>
                      <Td>{member?.username ?? order.member}</Td>
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
                      <Td>{hasProduct ? "Product assigned" : "Waiting assignment"}</Td>
                      <Td>{shortDate(order.createdAt)}</Td>
                      <Td>
                        {!hasProduct && !isCompleted ? (
                          <button
                            className="inline-flex items-center gap-1 rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
                            onClick={() => openProductModal(order)}
                          >
                            <PackagePlus size={14} /> Add Product
                          </button>
                        ) : (
                          <span className="inline-flex rounded bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                            Product Selected
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
      </Panel>

      {targetOrder && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 px-4">
          <div className="w-full max-w-2xl rounded bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black">Tambah Produk ke Pesanan</h3>
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

function Th({ children }: { children: React.ReactNode }) {
  return <th className="border-r border-slate-700 px-3 py-3 font-black last:border-r-0">{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="border-r border-slate-100 px-3 py-4 last:border-r-0">{children}</td>;
}
