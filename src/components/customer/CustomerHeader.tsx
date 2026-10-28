import { LogOut, Search, Settings, UserRound } from "lucide-react";
import type { Navigate } from "../../App";
import NotificationBell from "../NotificationBell";
import { useAppStore } from "../../store/AppStore";
import { getActiveCustomerId } from "../../services/customerSession";

const customerLogo = "/assets/customer-logo.jpeg";

interface CustomerHeaderProps {
  query: string;
  activeUsername?: string;
  onQueryChange: (query: string) => void;
  onLogout: () => void;
  navigate: Navigate;
}

export default function CustomerHeader({ query, activeUsername, onQueryChange, onLogout, navigate }: CustomerHeaderProps) {
  const { state } = useAppStore();
  const memberId = getActiveCustomerId();
  const member = state.members.find((item) => item.id === memberId);
  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100/70 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <button className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-white px-1.5 pr-3 shadow-sm ring-1 ring-emerald-100 hover:shadow-panel" onClick={() => navigate("/")} aria-label="Buka halaman kerja pelanggan">
          <span className="grid h-8 w-8 overflow-hidden rounded-xl">
            <img
              className="h-full w-full object-cover"
              src={customerLogo}
              alt="Tokopedia work account"
              decoding="async"
            />
          </span>
          <span className="hidden text-sm font-black tracking-tight text-forest sm:inline">tokopedia</span>
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded-full border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-sm outline-none focus:border-forest focus:bg-white"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cari produk atau kode pesanan"
          />
        </div>
        <NotificationBell scope="customer" member={member} navigate={navigate} />
        {activeUsername ? (
          <div className="group relative hidden sm:block">
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-forest">
              {activeUsername}
            </button>
            <div className="invisible absolute right-0 top-full z-50 w-52 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="overflow-hidden rounded bg-white shadow-panel ring-1 ring-slate-200">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-mint hover:text-forest"
                  onClick={() => navigate("/profile")}
                >
                  <UserRound size={16} />
                  Profil
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-mint hover:text-forest"
                  onClick={() => navigate("/profile#settings")}
                >
                  <Settings size={16} />
                  Pengaturan
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-coral hover:bg-rose-50"
                  onClick={onLogout}
                >
                  <LogOut size={16} />
                  Keluar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button className="hidden rounded-xl bg-forest px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 sm:block" onClick={() => navigate("/login")}>
            Login
          </button>
        )}
      </div>
    </header>
  );
}
