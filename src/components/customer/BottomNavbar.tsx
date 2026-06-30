import { Headphones, Home, ReceiptText, ShoppingBag, User } from "lucide-react";
import type { Navigate } from "../../App";

export default function BottomNavbar({ isLoggedIn, navigate, active = "home" }: { isLoggedIn?: boolean; navigate: Navigate; active?: "home" | "orders" | "claim" | "service" | "profile" }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden">
      <div className="grid grid-cols-5 text-xs font-semibold text-slate-500">
        <BottomNav icon={<Home />} label="Home" active={active === "home"} onClick={() => navigate("/")} />
        <BottomNav icon={<ReceiptText />} label="Task Orders" active={active === "orders"} onClick={() => navigate("/orders")} />
        <BottomNav icon={<ShoppingBag />} label="Take Order" active={active === "claim"} raised onClick={() => navigate("/")} />
        <BottomNav icon={<Headphones />} label="Customer Service" active={active === "service"} onClick={() => navigate("/service")} />
        <BottomNav icon={<User />} label={isLoggedIn ? "Profile" : "Login"} active={active === "profile"} onClick={() => navigate(isLoggedIn ? "/profile" : "/login")} />
      </div>
    </nav>
  );
}

function BottomNav({ icon, label, active, raised, onClick }: { icon: React.ReactNode; label: string; active?: boolean; raised?: boolean; onClick?: () => void }) {
  return (
    <button className={`relative grid min-h-16 place-items-center py-2 ${active ? "text-forest" : ""}`} onClick={onClick}>
      <span className={`grid h-8 w-8 place-items-center ${raised ? "-mt-7 h-14 w-14 rounded-full bg-forest text-white shadow-panel" : ""}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
