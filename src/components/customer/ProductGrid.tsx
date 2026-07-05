import type { Product } from "../../types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  favorites?: string[];
  onClearSearch: () => void;
  onToggleFavorite?: (productId: string) => void;
  onTakeOrder?: (product: Product) => void;
}

export default function ProductGrid({ products, onClearSearch }: ProductGridProps) {
  return (
    <section id="products">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-black">Produk yang direkomendasikan</h2>
        <button className="text-sm font-bold text-forest" onClick={onClearSearch}>
          Lihat semua
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.length ? (
          products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))
        ) : (
          <div className="rounded bg-white p-6 text-center text-sm text-slate-500 shadow-panel sm:col-span-2 xl:col-span-3">
            Saat ini tidak ada produk. Produk yang ditambahkan dari katalog admin akan muncul di sini.
          </div>
        )}
      </div>
    </section>
  );
}
