import { Search, X } from "lucide-react";
import { inputClass } from "../common";

export interface AdminFilterValues {
  promotionCode: string;
  usernameOrId: string;
  phone: string;
}

export const emptyAdminFilters: AdminFilterValues = {
  promotionCode: "",
  usernameOrId: "",
  phone: "",
};

export function normalizePhoneFilter(value?: string) {
  return String(value ?? "").replace(/\D/g, "");
}

export function getPhoneFilterVariants(value: string) {
  const phone = normalizePhoneFilter(value);
  if (!phone) return [];

  const variants = new Set([phone]);
  if (phone.startsWith("0")) variants.add(`62${phone.slice(1)}`);
  if (phone.startsWith("62")) variants.add(`0${phone.slice(2)}`);
  return [...variants];
}

export function hasActiveAdminFilters(filters: AdminFilterValues) {
  return Boolean(
    filters.promotionCode ||
      filters.usernameOrId ||
      filters.phone
  );
}

export default function Filters({
  children,
  values,
  onChange,
  onSearch,
  onClear,
}: {
  children?: React.ReactNode;
  values?: AdminFilterValues;
  onChange?: (field: keyof AdminFilterValues, value: string) => void;
  onSearch?: () => void;
  onClear?: () => void;
}) {
  const isControlled = Boolean(values && onChange && onSearch);
  const hasValue = Boolean(
    values?.promotionCode.trim() ||
      values?.usernameOrId.trim() ||
      values?.phone.trim()
  );

  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3">
      <form
        className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch?.();
        }}
      >
        <input
          className={inputClass}
          placeholder="Kode promosi"
          aria-label="Kode promosi"
          value={values?.promotionCode}
          onChange={(event) => onChange?.("promotionCode", event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Nama pengguna / ID"
          aria-label="Nama pengguna atau ID anggota"
          value={values?.usernameOrId}
          onChange={(event) => onChange?.("usernameOrId", event.target.value)}
        />
        <input
          className={inputClass}
          placeholder="Nomor telepon"
          aria-label="Nomor telepon"
          inputMode="tel"
          value={values?.phone}
          onChange={(event) => onChange?.("phone", event.target.value)}
        />
        <div className="flex min-w-0 gap-2">
          <button
            type="submit"
            className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded bg-sky-500 px-3 text-sm font-bold text-white transition hover:bg-sky-600"
          >
            <Search size={17} className="shrink-0" /> Cari
          </button>
          {isControlled && hasValue && (
            <button
              type="button"
              className="grid h-11 w-11 shrink-0 place-items-center rounded border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              onClick={onClear}
              aria-label="Hapus filter"
              title="Hapus filter"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </form>
      {children && <div className="border-t border-slate-200 pt-3">{children}</div>}
    </div>
  );
}
