import { Bell, CheckCircle2, Clock, LogOut, PackagePlus, UserPlus, WalletCards, X } from "lucide-react";
import { useState } from "react";
import type { Navigate } from "../../App";
import { roleLabel } from "../../services/adminSession";
import type { StaffAdmin } from "../../types";

const customerLogo = "/assets/customer-logo.jpeg";

export interface AdminNotification {
  id: string;
  title: string;
  text: string;
  time?: string;
  tone: "registration" | "topup" | "withdrawal" | "order" | "completed";
}

export default function AdminHeader({
  activeAdmin,
  notifications,
  navigate,
  onLogout,
}: {
  activeAdmin: StaffAdmin;
  notifications: AdminNotification[];
  navigate: Navigate;
  onLogout: () => void;
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-emerald-100">
            <img className="h-full w-full object-cover" src={customerLogo} alt="Tokopedia work account" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Admin Board</h1>
            <p className="text-xs text-slate-500">Registrations, deposits, releases, catalog, and staff activity</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 sm:block" onClick={() => navigate("/")}>
            Customer store
          </button>
          <div className="relative">
            <button
              className={`relative grid h-10 w-10 place-items-center rounded border text-slate-600 transition ${showNotifications ? "border-forest bg-mint text-forest" : "border-slate-200 hover:bg-slate-50"}`}
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications((isOpen) => !isOpen)}
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-black text-white">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] rounded border border-slate-200 bg-white shadow-panel">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-900">Notifications</p>
                    <p className="text-xs text-slate-500">{notifications.length ? "Latest admin activity" : "No notifications currently"}</p>
                  </div>
                  <button className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close notifications" onClick={() => setShowNotifications(false)}>
                    <X size={15} />
                  </button>
                </div>
                <div className="max-h-[380px] overflow-y-auto p-2">
                  {notifications.length ? (
                    notifications.map((notification) => (
                      <div key={notification.id} className="flex gap-3 rounded px-3 py-3 hover:bg-slate-50">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${notificationToneClass(notification.tone)}`}>
                          {notificationIcon(notification.tone)}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-slate-800">{notification.title}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{notification.text}</span>
                          {notification.time && <span className="mt-1 block text-[11px] font-bold text-slate-400">{notification.time}</span>}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="grid place-items-center px-4 py-8 text-center">
                      <Bell size={22} className="text-slate-300" />
                      <p className="mt-3 text-sm font-bold text-slate-700">No notifications currently</p>
                      <p className="mt-1 text-xs text-slate-500">New registrations, requests, and orders will show here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold">{activeAdmin.name}</p>
            <p className="text-xs text-slate-500">{roleLabel(activeAdmin.role)}</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded bg-coral px-3 py-2 text-sm font-semibold text-white" onClick={onLogout}>
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function notificationToneClass(tone: AdminNotification["tone"]) {
  const classes: Record<AdminNotification["tone"], string> = {
    registration: "bg-emerald-50 text-emerald-700",
    topup: "bg-mint text-forest",
    withdrawal: "bg-rose-50 text-rose-700",
    order: "bg-amber-50 text-amber-700",
    completed: "bg-blue-50 text-blue-700",
  };
  return classes[tone];
}

function notificationIcon(tone: AdminNotification["tone"]) {
  if (tone === "registration") return <UserPlus size={17} />;
  if (tone === "topup") return <WalletCards size={17} />;
  if (tone === "withdrawal") return <Clock size={17} />;
  if (tone === "completed") return <CheckCircle2 size={17} />;
  return <PackagePlus size={17} />;
}
