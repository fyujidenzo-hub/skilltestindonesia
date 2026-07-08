import { Headphones, Home, ReceiptText, User, Zap } from "lucide-react";
import type { Navigate } from "../../App";

export default function BottomNavbar({ isLoggedIn, navigate, active = "home" }: { isLoggedIn?: boolean; navigate: Navigate; active?: "home" | "orders" | "claim" | "service" | "profile" }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-100 bg-white/95 shadow-[0_-16px_45px_rgba(15,23,42,0.12)] backdrop-blur sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-[min(760px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-[2rem] sm:border sm:shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      <div className="grid min-h-[76px] grid-cols-5 text-xs font-semibold text-slate-500">
        <BottomNav icon={<Home />} label="Home" active={active === "home"} onClick={() => navigate("/")} />
        <BottomNav icon={<ReceiptText />} label="Task Orders" active={active === "orders"} onClick={() => navigate("/orders")} />
        <BottomNav icon={<Zap fill="currentColor" />} label="Take Order" active={active === "claim"} raised onClick={() => navigate("/take-order")} />
        <BottomNav icon={<Headphones />} label="Customer Service" active={active === "service"} onClick={() => navigate("/service")} />
        <BottomNav icon={<User />} label={isLoggedIn ? "Profile" : "Login"} active={active === "profile"} onClick={() => navigate(isLoggedIn ? "/profile" : "/login")} />
      </div>
    </nav>
  );
}

function BottomNav({ icon, label, active, raised, onClick }: { icon: React.ReactNode; label: string; active?: boolean; raised?: boolean; onClick?: () => void }) {
  return (
    <button className={`relative flex min-h-[76px] flex-col items-center justify-end gap-1 pb-3 pt-2 ${active ? "text-forest" : ""}`} onClick={onClick}>
      <span className={`grid h-8 w-8 place-items-center ${raised ? "absolute -top-6 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-[6px] border-white bg-gradient-to-br from-forest to-lime-500 text-white shadow-[0_14px_32px_rgba(22,141,98,0.35)]" : ""}`}>{icon}</span>
      <span className={raised ? "pt-8" : ""}>{label}</span>
    </button>
  );
}
