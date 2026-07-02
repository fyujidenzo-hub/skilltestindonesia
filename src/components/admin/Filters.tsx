import { Search } from "lucide-react";
import { inputClass } from "../common";

export default function Filters({ children }: { children?: React.ReactNode }) {
  return (
    <div className="grid gap-3 rounded border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-3 md:grid-cols-4">
        <input className={inputClass} placeholder="Promotion code" />
        <input className={inputClass} placeholder="Username / ID" />
        <input className={inputClass} placeholder="Phone number" />
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-sky-500 px-4 text-sm font-bold text-white">
          <Search size={17} /> Search
        </button>
      </div>
      {children && <div className="border-t border-slate-200 pt-3">{children}</div>}
    </div>
  );
}
