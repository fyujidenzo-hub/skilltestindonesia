import { Banknote, PackageCheck, ReceiptText, ShieldCheck, Tag, User, WalletCards } from "lucide-react";
import type { Navigate } from "../../App";

interface StoreShortcutGridProps {
  navigate: Navigate;
  onTopUp: () => void;
  onWithdraw: () => void;
}

export default function StoreShortcutGrid({ navigate, onTopUp, onWithdraw }: StoreShortcutGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
      <StoreShortcut icon={<Tag />} label="Promo" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })} />
      <StoreShortcut icon={<PackageCheck />} label="Orders" onClick={() => document.getElementById("assignment")?.scrollIntoView({ behavior: "smooth" })} />
      <StoreShortcut icon={<WalletCards />} label="Top Up" onClick={onTopUp} />
      <StoreShortcut icon={<Banknote />} label="Withdraw" onClick={onWithdraw} />
      <StoreShortcut icon={<ReceiptText />} label="Records" onClick={() => document.getElementById("records")?.scrollIntoView({ behavior: "smooth" })} />
      <StoreShortcut icon={<ShieldCheck />} label="Security" onClick={() => navigate("/profile#settings")} />
      <StoreShortcut icon={<User />} label="Account" onClick={() => navigate("/login")} />
    </div>
  );
}

function StoreShortcut({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="grid min-h-24 place-items-center rounded bg-white p-3 text-center text-xs font-bold shadow-panel sm:text-sm" onClick={onClick}>
      <span className="grid h-12 w-12 place-items-center rounded bg-mint text-forest">{icon}</span>
      {label}
    </button>
  );
}
