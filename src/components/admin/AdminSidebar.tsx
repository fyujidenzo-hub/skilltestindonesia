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
<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-xl">
  {/* Background Glow */}
  <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl"></div>
  <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>

  <div className="relative flex items-center justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-100">
        System Status
      </p>

      <h3 className="mt-2 text-xl font-bold">
        {firebaseReady ? "Connected & Ready" : "Offline Mode"}
      </h3>

      <p className="mt-2 text-sm text-emerald-100">
        {firebaseReady
          ? "All services are online. Your team can start managing appointments and customer records."
          : "Running in local mode. Data will be stored locally until the connection is restored."}
      </p>
    </div>

    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full border border-white/20 ${
        firebaseReady ? "bg-emerald-400/20" : "bg-amber-400/20"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full ${
          firebaseReady ? "animate-pulse bg-emerald-300" : "bg-amber-300"
        }`}
      />
    </div>
  </div>

  <div className="relative mt-5 flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
    <div>
      <p className="text-xs uppercase tracking-wide text-emerald-100">
        Database
      </p>
      <p className="font-semibold">
        {firebaseReady ? "Firebase Cloud Connected" : "Local Storage"}
      </p>
    </div>

    <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
      {firebaseReady ? "🟢 LIVE" : "🟡 LOCAL"}
    </span>
  </div>
</div>
      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`flex items-center gap-3 rounded px-3 py-3 text-left text-sm font-semibold ${activeTab === tab ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-mint"}`}
          >
            {adminTabIcon(tab)}
            {tab}
          </button>
        ))}
      </nav>
    </aside>
  );
}
