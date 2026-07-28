import { useState } from "react";
import { inputClass } from "../common";
import { createProduct } from "../../services/productsService";
import { useAppStore } from "../../store/AppStore";
import type { Product } from "../../types";
import { normalizeProductImage } from "../ProductImage";

const CATEGORIES = ["Electronics", "Health", "Home", "Lifestyle", "Fashion", "Beauty", "Sports", "Books"];
const CATEGORY_LABELS: Record<string, string> = {
  Electronics: "Elektronik",
  Health: "Kesehatan",
  Home: "Rumah",
  Lifestyle: "Gaya Hidup",
  Fashion: "Mode",
  Beauty: "Kecantikan",
  Sports: "Olahraga",
  Books: "Buku",
};

function generateProductCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function ProductForm() {
  const { dispatch } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Omit<Product, "id">>({
    code: generateProductCode(),
    name: "",
    price: 0,
    commission: 0,
    requiredBalance: 0,
    quantity: 1,
    category: "Electronics",
    image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80",
  });

  const handlePriceChange = (price: number) => {
    const commission = Math.round(price * 0.2); // 20% commission
    setForm({ ...form, price, commission });
  };

  const handleRegenCode = () => {
    setForm({ ...form, code: generateProductCode() });
  };

  return (
    <form
      className="grid gap-4 rounded bg-slate-50 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!form.name.trim()) {
          setMessage("Nama produk wajib diisi.");
          return;
        }

        setSaving(true);
        setMessage("Menyimpan produk...");

        try {
          const savedProduct = await createProduct({
            ...form,
            image: normalizeProductImage(form.image),
          });
          dispatch({ type: "addProduct", payload: savedProduct });
          setForm({
            code: generateProductCode(),
            name: "",
            price: 0,
            commission: 0,
            requiredBalance: 0,
            quantity: 1,
            category: "Electronics",
            image: "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=600&q=80",
          });
          setMessage("Produk berhasil disimpan.");
        } catch (error) {
          console.error("Failed to save product:", error);
          setMessage("Gagal menyimpan produk.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <label className="text-xs font-bold text-slate-600">Kode (dibuat otomatis)</label>
          <div className="mt-1 flex gap-2">
            <input className={`${inputClass} min-w-0 flex-1`} disabled value={form.code} />
            <button
              type="button"
              onClick={handleRegenCode}
              className="shrink-0 rounded bg-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-400"
            >
              Buat ulang
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600">Nama *</label>
          <input
            className={inputClass}
            placeholder="Nama produk"
            required
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600">Kategori *</label>
          <select
            className={inputClass}
            required
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat] ?? cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-slate-600">Harga (IDR)</label>
          <input
            className={inputClass}
            type="number"
            placeholder="0"
            value={form.price || ""}
            onChange={(event) => handlePriceChange(Number(event.target.value) || 0)}
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-600">Komisi (20% otomatis)</label>
          <input className={inputClass} type="number" disabled value={form.commission} />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600">Saldo kerja yang diperlukan (IDR)</label>
        <input
          className={inputClass}
          type="number"
          placeholder="0"
          value={form.requiredBalance || ""}
          onChange={(event) => setForm({ ...form, requiredBalance: Number(event.target.value) || 0 })}
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-600">URL gambar</label>
        <input
          className={inputClass}
          placeholder="https://..."
          value={form.image}
          onChange={(event) => setForm({ ...form, image: event.target.value })}
        />
      </div>

      {message && (
        <p className={`rounded px-3 py-2 text-sm font-semibold ${message.includes("Gagal") || message.includes("wajib") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      )}

      <button disabled={saving} className="rounded bg-forest px-4 py-3 font-bold text-white hover:bg-forest/90 disabled:bg-slate-400">
        {saving ? "Menyimpan..." : "Simpan produk"}
      </button>
    </form>
  );
}
