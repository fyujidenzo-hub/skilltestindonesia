export type AmountSort = "none" | "asc" | "desc";

interface AmountSortControlsProps {
  value: AmountSort;
  onChange: (value: AmountSort) => void;
  label?: string;
  className?: string;
}

export default function AmountSortControls({ value, onChange, label = "Amount", className = "" }: AmountSortControlsProps) {
  const toggleSort = (nextValue: Exclude<AmountSort, "none">) => {
    onChange(value === nextValue ? "none" : nextValue);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-500">Sort {label}</span>
      <button
        type="button"
        className={sortButtonClass(value === "asc")}
        onClick={() => toggleSort("asc")}
        aria-pressed={value === "asc"}
      >
        ↑ Lowest first
      </button>
      <button
        type="button"
        className={sortButtonClass(value === "desc")}
        onClick={() => toggleSort("desc")}
        aria-pressed={value === "desc"}
      >
        ↓ Highest first
      </button>
    </div>
  );
}

function sortButtonClass(active: boolean) {
  return [
    "rounded-full border px-3 py-1.5 text-xs font-black transition",
    active
      ? "border-forest bg-forest text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-600 hover:border-forest/40 hover:text-forest",
  ].join(" ");
}
