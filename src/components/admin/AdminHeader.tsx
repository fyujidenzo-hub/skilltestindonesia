import { LogOut } from "lucide-react";
import type { Navigate } from "../../App";
import { roleLabel } from "../../services/adminSession";
import type { StaffAdmin } from "../../types";
import NotificationBell from "../NotificationBell";

const customerLogo = "/assets/customer-logo.jpeg";

export default function AdminHeader({
  activeAdmin,
  navigate,
  onLogout,
  onNotificationTab,
}: {
  activeAdmin: StaffAdmin;
  navigate: Navigate;
  onLogout: () => void;
  onNotificationTab?: (tab: "Members" | "Tasks" | "Orders" | "Finance") => void;
}) {

  return (
    <header className="sticky top-0 z-30 border-b border-emerald-100/70 bg-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
            <img className="h-full w-full object-cover" src={customerLogo} alt="Akun kerja Tokopedia" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Dewan Admin</h1>
            <p className="text-xs text-slate-500">Pendaftaran, deposit, pelepasan, katalog, dan aktivitas staf</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-mint hover:text-forest sm:block" onClick={() => navigate("/")}>
            Halaman kerja
          </button>
          <NotificationBell scope="admin" admin={activeAdmin} navigate={navigate} onAdminTab={onNotificationTab} />
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold">{activeAdmin.name}</p>
            <p className="text-xs text-slate-500">{roleLabel(activeAdmin.role)}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-xl bg-coral px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-red-500" onClick={onLogout}>
            <LogOut size={16} />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>
    </header>
  );
}
