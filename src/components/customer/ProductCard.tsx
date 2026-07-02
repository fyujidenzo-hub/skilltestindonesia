import { Heart } from "lucide-react";
import type { Product } from "../../types";
import { formatRupiah } from "../../utils";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onTakeOrder: () => void;
}

export default function ProductCard({ product, isFavorite, onToggleFavorite, onTakeOrder }: ProductCardProps) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-white bg-white shadow-[0_14px_38px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.12)]">
      <div className="overflow-hidden bg-slate-100">
        <img className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03]" src={product.image} alt={product.name} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-forest">{product.code}</p>
            <h3 className="mt-1 min-h-12 font-bold">{product.name}</h3>
          </div>
          <button
            type="button"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm transition ${isFavorite ? "bg-coral text-white" : "bg-rose-50 text-coral hover:bg-coral hover:text-white"}`}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
          >
            <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="mt-3 text-lg font-black">{formatRupiah(product.price)}</p>
        <p className="text-sm text-emerald-700">Commission {formatRupiah(product.commission)}</p>
        <p className="text-xs font-semibold text-slate-500">Required balance {formatRupiah(product.requiredBalance ?? 0)}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {product.quantity > 0 ? "Available" : "Unavailable"}
          </span>
          <button className="rounded-xl bg-forest px-3 py-2 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300" disabled={product.quantity <= 0} onClick={onTakeOrder}>
            Take Order
          </button>
        </div>
      </div>
    </article>
  );
}
