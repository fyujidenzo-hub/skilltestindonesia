import { BadgeCheck, Boxes, Eye, Package, Plus, Tag, X } from "lucide-react";
import { useState } from "react";
import { Panel } from "../common";
import type { Product } from "../../types";
import { formatRupiah } from "../../utils";
import ProductForm from "./ProductForm";

export default function CatalogAdmin({ products }: { products: Product[] }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <Panel title="Product Catalog" action={<button className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Add product</button>}>
      {showForm && <ProductForm />}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <article
            key={product.id}
            className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-panel"
          >
            <button type="button" className="block w-full text-left" onClick={() => setSelectedProduct(product)}>
              <div className="relative overflow-hidden bg-slate-100">
                <img className="h-36 w-full object-cover transition duration-300 group-hover:scale-[1.04]" src={product.image} alt={product.name} />
                <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-black shadow-sm ${product.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {product.quantity > 0 ? "Available" : "Unavailable"}
                </span>
                <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-forest shadow-sm opacity-0 transition group-hover:opacity-100">
                  <Eye size={17} />
                </span>
              </div>
            </button>
            <div className="p-4">
              <p className="text-xs font-bold uppercase text-forest">{product.code}</p>
              <h3 className="mt-1 min-h-12 font-bold">{product.name}</h3>
              <div className="mt-4 grid gap-2 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <span className="block text-xs font-bold uppercase text-slate-500">Price</span>
                  <span className="font-black text-slate-900">{formatRupiah(product.price)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <p className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><span className="block text-xs font-bold uppercase text-emerald-600">Commission</span>{formatRupiah(product.commission)}</p>
                  <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs font-bold uppercase text-slate-500">Category</span>{product.category}</p>
                </div>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 transition hover:border-forest hover:text-forest"
                  onClick={() => setSelectedProduct(product)}
                >
                  <Eye size={15} /> View details
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedProduct && (
        <ProductDetailsModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </Panel>
  );
}

function ProductDetailsModal({ product, onClose }: { product: Product; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-panel">
        <div className="grid md:grid-cols-[280px_1fr]">
          <div className="relative min-h-64 bg-slate-100">
            <img className="h-full min-h-64 w-full object-cover" src={product.image} alt={product.name} />
            <span className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black shadow-sm ${product.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
              {product.quantity > 0 ? "Available" : "Unavailable"}
            </span>
          </div>
          <div className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-forest">Product details</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">{product.name}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">{product.code}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={onClose} aria-label="Close product details">
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <DetailTile icon={<Tag size={17} />} label="Price" value={formatRupiah(product.price)} />
              <DetailTile icon={<BadgeCheck size={17} />} label="Commission" value={formatRupiah(product.commission)} tone="green" />
              <DetailTile icon={<Package size={17} />} label="Required Balance" value={formatRupiah(product.requiredBalance ?? 0)} />
              <DetailTile icon={<Boxes size={17} />} label="Category" value={product.category} />
            </div>

            <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-black text-emerald-800">Catalog status</p>
              <p className="mt-1 text-sm text-emerald-700">
                This product is currently {product.quantity > 0 ? "available for task assignment." : "unavailable for task assignment."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailTile({ icon, label, value, tone = "slate" }: { icon: React.ReactNode; label: string; value: string; tone?: "slate" | "green" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "green" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-900"}`}>
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <span className={tone === "green" ? "text-emerald-600" : "text-forest"}>{icon}</span>
        <span className="text-xs font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}
