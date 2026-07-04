import { CheckCircle2, Server } from "lucide-react";
import { adminTabIcon, type AdminTab } from "../../constants";
import { firebaseReady } from "../../firebase";

interface AdminSidebarProps {
  activeTab: AdminTab;
  tabs: readonly AdminTab[];
  persistence: "firebase" | "local";
  onTabChange: (tab: AdminTab) => void;
}

export default function AdminSidebar({ activeTab, tabs, persistence, onTabChange }: AdminSidebarProps) {
  return (
    <aside className="h-fit border-b border-slate-200 pb-4 lg:sticky lg:top-20 lg:border-b-0">
      <div className="mb-4 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(145deg,#047857_0%,#0f9f6b_58%,#0f766e_100%)] p-5 text-white shadow-[0_22px_60px_rgba(15,118,110,0.24)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-100">System Status</p>
            <h3 className="mt-3 text-xl font-black leading-tight">
              {firebaseReady ? "Connected & Ready" : "System Ready"}
            </h3>
          </div>
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
              firebaseReady ? "border-emerald-200/50 bg-white/15 text-emerald-100" : "border-amber-200/50 bg-white/15 text-amber-100"
            }`}
          >
            <CheckCircle2 size={20} />
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-emerald-50">
          {firebaseReady
            ? "All services are online. Your team can manage customer records."
            : "System is ready. Your team can continue managing customer records."}
        </p>

        <div className="mt-5 rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded bg-white/15">
              <Server size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-100">Connection</p>
              <p className="mt-0.5 text-sm font-black leading-5">
                {firebaseReady ? "System Connected" : "System Ready"}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${firebaseReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {firebaseReady ? "LIVE" : "READY"}
            </span>
          </div>
        </div>
      </div>
      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold shadow-sm ${
              activeTab === tab
                ? "bg-slate-900 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]"
                : "bg-white text-slate-600 ring-1 ring-slate-100 hover:-translate-y-0.5 hover:bg-mint hover:text-forest"
            }`}
          >
            {adminTabIcon(tab)}
            {tab}
          </button>
        ))}
      </nav>
    </aside>
  );
}
