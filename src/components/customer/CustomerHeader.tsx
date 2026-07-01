import { Bell, CheckCircle2, Clock, LogOut, PackageCheck, Search, Settings, UserRound, XCircle } from "lucide-react";
import type { Navigate } from "../../App";

const customerLogo = "/assets/customer-logo.jpeg";

export interface CustomerNotification {
  id: string;
  title: string;
  text: string;
  tone: "info" | "success" | "warning" | "danger";
}

interface CustomerHeaderProps {
  query: string;
  activeUsername?: string;
  notifications: CustomerNotification[];
  onQueryChange: (query: string) => void;
  onLogout: () => void;
  navigate: Navigate;
}

export default function CustomerHeader({ query, activeUsername, notifications, onQueryChange, onLogout, navigate }: CustomerHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <button className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded bg-white shadow-sm ring-1 ring-emerald-100" onClick={() => navigate("/")} aria-label="Go to customer store">
          <img className="h-full w-full object-cover" src={customerLogo} alt="Tokopedia work account" />
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-forest"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search products or order code"
          />
        </div>
        <div className="group relative">
          <button className="relative grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Notifications">
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-black text-white">
                {notifications.length}
              </span>
            )}
          </button>
          <div className="invisible absolute right-0 top-full z-50 w-80 max-w-[calc(100vw-2rem)] pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
            <div className="overflow-hidden rounded bg-white shadow-panel ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-black">Notifications</p>
                <p className="text-xs text-slate-500">{notifications.length ? "Recent account activity" : "You are all caught up"}</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length ? (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className="flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                      onClick={() => navigate("/profile")}
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${notificationToneClass(notification.tone)}`}>
                        {notificationIcon(notification.tone)}
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-slate-800">{notification.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-slate-500">{notification.text}</span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-400">
                      <Bell size={20} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-700">No notifications currently</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Order updates, top-up requests, and withdrawal updates will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {activeUsername ? (
          <div className="group relative hidden sm:block">
            <button className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white">
              {activeUsername}
            </button>
            <div className="invisible absolute right-0 top-full z-50 w-52 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="overflow-hidden rounded bg-white shadow-panel ring-1 ring-slate-200">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-mint hover:text-forest"
                  onClick={() => navigate("/profile")}
                >
                  <UserRound size={16} />
                  Profile
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-mint hover:text-forest"
                  onClick={() => navigate("/profile#settings")}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-coral hover:bg-rose-50"
                  onClick={onLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button className="hidden rounded bg-forest px-4 py-2 text-sm font-bold text-white sm:block" onClick={() => navigate("/login")}>
            Login
          </button>
        )}
      </div>
    </header>
  );
}

function notificationToneClass(tone: CustomerNotification["tone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700";
  if (tone === "warning") return "bg-amber-50 text-amber-700";
  if (tone === "danger") return "bg-rose-50 text-coral";
  return "bg-mint text-forest";
}

function notificationIcon(tone: CustomerNotification["tone"]) {
  if (tone === "success") return <CheckCircle2 size={16} />;
  if (tone === "warning") return <Clock size={16} />;
  if (tone === "danger") return <XCircle size={16} />;
  return <PackageCheck size={16} />;
}
