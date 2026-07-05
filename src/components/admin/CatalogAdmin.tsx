import { AlertTriangle, BadgeCheck, Boxes, Eye, Package, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Panel } from "../common";
import type { Product } from "../../types";
import { formatRupiah } from "../../utils";
import ProductForm from "./ProductForm";
import { deleteProduct, updateProduct } from "../../services/productsService";
import { useAppStore } from "../../store/AppStore";

export default function CatalogAdmin({ products }: { products: Product[] }) {
  const { dispatch } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSaveStatus = async (product: Product, available: boolean) => {
    setIsSavingStatus(true);
    setStatusMessage("");

    const nextQuantity = available ? Math.max(1, Number(product.quantity || 1)) : 0;
    const updatedProduct: Product = {
      ...product,
      quantity: nextQuantity,
    };

    try {
      await updateProduct(product.id, {
        quantity: nextQuantity,
      });

      dispatch({ type: "updateProduct", payload: updatedProduct });

      setSelectedProduct((current) =>
        current?.id === product.id ? updatedProduct : current
      );

      setEditingProduct(null);
      setStatusMessage(
        `${product.name} is now ${available ? "Tersedia" : "Tidak tersedia"}.`
      );
    } catch (error) {
      console.error("Failed to update product status:", error);
      setStatusMessage("Unable to update product status. Check Firestore product rules.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeletingProduct(true);
    setStatusMessage("");
    try {
      await deleteProduct(productToDelete.id);
      dispatch({ type: "deleteProduct", payload: { id: productToDelete.id } });
      setSelectedProduct((current) => (current?.id === productToDelete.id ? null : current));
      setEditingProduct((current) => (current?.id === productToDelete.id ? null : current));
      setStatusMessage(`${productToDelete.name} deleted successfully.`);
      setProductToDelete(null);
    } catch (error) {
      console.error("Failed to delete product:", error);
      setStatusMessage("Unable to delete product. Check Firestore product rules.");
    } finally {
      setIsDeletingProduct(false);
    }
  };

  return (
    <Panel
      title="Katalog Produk"
      action={
        <button
          className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus size={16} /> Tambahkan produk
        </button>
      }
    >
      {showForm && <ProductForm />}

      {statusMessage && (
        <p
          className={`mt-4 rounded px-4 py-3 text-sm font-bold ${
            statusMessage.startsWith("Tidak dapat")
              ? "bg-red-50 text-red-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {statusMessage}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => {
          const isAvailable = product.quantity > 0;

          return (
            <article
              key={product.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-panel"
            >
              <button
                type="button"
                className="block w-full text-left"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="relative overflow-hidden bg-slate-100">
                  <img
                    className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                    src={product.image}
                    alt={product.name}
                  />

                  <span
                    className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                      isAvailable
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isAvailable ? "Available" : "Unavailable"}
                  </span>

                  <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-forest shadow-sm opacity-0 transition group-hover:opacity-100">
                    <Eye size={17} />
                  </span>
                </div>
              </button>

              <div className="p-4">
                <p className="text-xs font-bold uppercase text-forest">
                  {product.code}
                </p>

                <h3 className="mt-1 min-h-12 font-bold">{product.name}</h3>

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="block text-xs font-bold uppercase text-slate-500">
                      Price
                    </span>
                    <span className="font-black text-slate-900">
                      {formatRupiah(product.price)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800">
                      <span className="block text-xs font-bold uppercase text-emerald-600">
                        Komisi
                      </span>
                      {formatRupiah(product.commission)}
                    </p>

                    <p className="rounded-xl bg-slate-50 p-3">
                      <span className="block text-xs font-bold uppercase text-slate-500">
                        Kategori
                      </span>
                      {product.category}
                    </p>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-black text-slate-700 transition hover:border-forest hover:text-forest"
                      onClick={() => setSelectedProduct(product)}
                    >
                      <Eye size={15} /> Rincian
                    </button>

                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-forest px-2 py-2 text-xs font-black text-white transition hover:bg-forest/90"
                      onClick={() => setEditingProduct(product)}
                    >
                      <Pencil size={15} /> Sunting
                    </button>

                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                      onClick={() => setProductToDelete(product)}
                    >
                      <Trash2 size={15} /> Menghapus
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onEdit={() => setEditingProduct(selectedProduct)}
        />
      )}

      {editingProduct && (
        <ProductStatusModal
          product={editingProduct}
          isSaving={isSavingStatus}
          onClose={() => setEditingProduct(null)}
          onSave={(available) => handleSaveStatus(editingProduct, available)}
        />
      )}

      {productToDelete && (
        <DeleteProductDialog
          product={productToDelete}
          isDeleting={isDeletingProduct}
          onCancel={() => {
            if (!isDeletingProduct) setProductToDelete(null);
          }}
          onConfirm={handleDeleteProduct}
        />
      )}
    </Panel>
  );
}

function DeleteProductDialog({
  product,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  product: Product;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-panel">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Hapus produk?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {product.name} akan dihapus dari katalog.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-3 font-black text-slate-700 hover:bg-slate-50" onClick={onCancel} disabled={isDeleting}>
            Membatalkan
          </button>
          <button type="button" className="rounded-xl bg-rose-600 px-4 py-3 font-black text-white disabled:bg-slate-400" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Menghapus..." : "Menghapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductDetailsModal({
  product,
  onClose,
  onEdit,
}: {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
}) {
  const isAvailable = product.quantity > 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-panel">
        <div className="grid md:grid-cols-[280px_1fr]">
          <div className="relative min-h-64 bg-slate-100">
            <img
              className="h-full min-h-64 w-full object-cover"
              src={product.image}
              alt={product.name}
            />

            <span
              className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black shadow-sm ${
                isAvailable
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {isAvailable ? "Tersedia" : "Tidak tersedia"}
            </span>
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-forest">
                  Detail produk
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  {product.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {product.code}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-sm font-black text-white hover:bg-forest/90"
                  onClick={onEdit}
                >
                  <Pencil size={16} /> 
                          Sunting
                </button>

                <button
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                  onClick={onClose}
                  aria-label="Close product details"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile icon={<Tag size={17} />} label="Price" value={formatRupiah(product.price)} />
              <DetailTile icon={<BadgeCheck size={17} />} label="Commission" value={formatRupiah(product.commission)} tone="green" />
              <DetailTile icon={<Package size={17} />} label="Required Balance" value={formatRupiah(product.requiredBalance ?? 0)} />
              <DetailTile icon={<Boxes size={17} />} label="Category" value={product.category} />
            </div>

            <div
              className={`mt-6 rounded-2xl border p-4 ${
                isAvailable
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-rose-100 bg-rose-50"
              }`}
            >
              <p
                className={`text-sm font-black ${
                  isAvailable ? "text-emerald-800" : "text-rose-800"
                }`}
              >
                Status katalog
              </p>

              <p
                className={`mt-1 text-sm ${
                  isAvailable ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                Produk ini saat ini{" "}
                {isAvailable
                  ? "available for task assignment."
                  : "unavailable for task assignment."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductStatusModal({
  product,
  isSaving,
  onClose,
  onSave,
}: {
  product: Product;
  isSaving: boolean;
  onClose: () => void;
  onSave: (available: boolean) => void;
}) {
  const [available, setAvailable] = useState(product.quantity > 0);
  const currentAvailable = product.quantity > 0;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-forest">
              Ubah status produk
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              {product.name}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {product.code}
            </p>
          </div>

          <button
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
            onClick={onClose}
            aria-label="Close status editor"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase text-slate-500">
            Status saat ini
          </p>
          <p
            className={`mt-1 font-black ${
              currentAvailable ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {currentAvailable ? "Available" : "Unavailable"}
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              available
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"
            }`}
            onClick={() => setAvailable(true)}
          >
            <span className="block font-black">Tersedia</span>
            <span className="mt-1 block text-xs font-semibold">
              Pelanggan/admin dapat menggunakan item ini untuk berbagai tugas.
            </span>
          </button>

          <button
            type="button"
            className={`rounded-2xl border px-4 py-3 text-left transition ${
              !available
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-rose-200"
            }`}
            onClick={() => setAvailable(false)}
          >
            <span className="block font-black">Tidak tersedia</span>
            <span className="mt-1 block text-xs font-semibold">
           Item ini akan ditampilkan sebagai tidak tersedia dan tidak dapat ditetapkan.
            </span>
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-3 font-black text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
           Membatalkan
          </button>

          <button
            type="button"
            disabled={isSaving}
            className="rounded-xl bg-forest px-4 py-3 font-black text-white disabled:bg-slate-400"
            onClick={() => onSave(available)}
          >
            {isSaving ? "Saving..." : "Save status"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailTile({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "slate" | "green";
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <span className={tone === "green" ? "text-emerald-600" : "text-forest"}>
          {icon}
        </span>
        <span className="text-xs font-black uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="text-lg font-black">{value}</p>
    </div>
  );
}