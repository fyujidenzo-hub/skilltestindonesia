import { Plus } from "lucide-react";
import { useState } from "react";
import { Panel } from "../common";
import type { Product } from "../../types";
import { formatRupiah } from "../../utils";
import ProductForm from "./ProductForm";

export default function CatalogAdmin({ products }: { products: Product[] }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <Panel title="Product Catalog" action={<button className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Add product</button>}>
      {showForm && <ProductForm />}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {products.map((product) => (
          <article key={product.id} className="overflow-hidden rounded border border-slate-200 bg-white">
            <img className="h-36 w-full object-cover" src={product.image} alt={product.name} />
            <div className="p-4">
              <p className="text-xs font-bold uppercase text-forest">{product.code}</p>
              <h3 className="mt-1 min-h-12 font-bold">{product.name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p><span className="block text-xs text-slate-500">Price</span>{formatRupiah(product.price)}</p>
                <p><span className="block text-xs text-slate-500">Commission</span>{formatRupiah(product.commission)}</p>
                <p><span className="block text-xs text-slate-500">Quantity</span>{product.quantity}</p>
                <p><span className="block text-xs text-slate-500">Category</span>{product.category}</p>
                <p><span className="block text-xs text-slate-500">Required balance</span>{formatRupiah(product.requiredBalance ?? 0)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
