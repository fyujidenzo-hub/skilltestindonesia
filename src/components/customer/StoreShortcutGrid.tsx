import { ArrowRight, Banknote, PackageCheck, ReceiptText, ShieldCheck, User, WalletCards, X } from "lucide-react";
import { useState } from "react";
import type { Navigate } from "../../App";

interface StoreShortcutGridProps {
  navigate: Navigate;
  onTopUp: () => void;
  onWithdraw: () => void;
  isLoggedIn?: boolean;
}

type ShortcutModal = "records" | "security" | "account" | null;

export default function StoreShortcutGrid({ navigate, onTopUp, onWithdraw, isLoggedIn = false }: StoreShortcutGridProps) {
  const [modal, setModal] = useState<ShortcutModal>(null);

  return (
    <>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        <StoreShortcut icon={<PackageCheck />} label="Orders" onClick={() => navigate("/orders")} />
        <StoreShortcut icon={<WalletCards />} label="Top Up" onClick={onTopUp} />
        <StoreShortcut icon={<Banknote />} label="Withdraw" onClick={onWithdraw} />
        <StoreShortcut icon={<ReceiptText />} label="Records" onClick={() => setModal("records")} />
        <StoreShortcut icon={<ShieldCheck />} label="Security" onClick={() => setModal("security")} />
        <StoreShortcut icon={<User />} label="Account" onClick={() => setModal("account")} />
      </div>

      {modal === "records" && (
        <ShortcutInfoModal
          icon={<ReceiptText size={24} />}
          title="Records"
          description="Review your task orders, top-up history, withdrawal history, and account activity from your profile and task pages."
          primaryLabel="Open profile records"
          onPrimary={() => {
            setModal(null);
            navigate(isLoggedIn ? "/profile" : "/login");
          }}
          secondaryLabel="Task orders"
          onSecondary={() => {
            setModal(null);
            navigate("/orders");
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "security" && (
        <ShortcutInfoModal
          icon={<ShieldCheck size={24} />}
          title="Security Settings"
          description="Manage your account password and withdrawal password from your profile security section."
          primaryLabel={isLoggedIn ? "Open security" : "Login first"}
          onPrimary={() => {
            setModal(null);
            navigate(isLoggedIn ? "/profile" : "/login");
          }}
          onClose={() => setModal(null)}
        />
      )}

      {modal === "account" && (
        <ShortcutInfoModal
          icon={<User size={24} />}
          title={isLoggedIn ? "Account Profile" : "Customer Login"}
          description={isLoggedIn ? "View your balance, referral code, order history, and account settings." : "Login to access your work account, order tasks, top-up, and withdrawal requests."}
          primaryLabel={isLoggedIn ? "Open profile" : "Login"}
          onPrimary={() => {
            setModal(null);
            navigate(isLoggedIn ? "/profile" : "/login");
          }}
          secondaryLabel={isLoggedIn ? "Task orders" : "Create account"}
          onSecondary={() => {
            setModal(null);
            navigate(isLoggedIn ? "/orders" : "/register");
          }}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

function StoreShortcut({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="group grid min-h-24 place-items-center rounded-3xl border border-white bg-white/95 p-3 text-center text-xs font-black shadow-[0_14px_38px_rgba(15,23,42,0.07)] ring-1 ring-slate-100 hover:-translate-y-1 hover:border-emerald-100 hover:shadow-[0_18px_48px_rgba(22,141,98,0.16)] sm:text-sm" onClick={onClick}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-forest transition group-hover:bg-forest group-hover:text-white">{icon}</span>
      <span className="mt-1">{label}</span>
    </button>
  );
}

function ShortcutInfoModal({
  icon,
  title,
  description,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  onClose,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md overflow-hidden rounded bg-white shadow-panel">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded bg-mint text-forest">{icon}</div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-forest">Customer shortcut</p>
              <h2 className="text-xl font-black text-slate-900">{title}</h2>
            </div>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded hover:bg-slate-100" onClick={onClose} aria-label="Close shortcut details">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm leading-6 text-slate-600">{description}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button className="inline-flex items-center justify-center gap-2 rounded bg-forest px-4 py-3 text-sm font-black text-white" onClick={onPrimary}>
              {primaryLabel}
              <ArrowRight size={16} />
            </button>
            {secondaryLabel && onSecondary ? (
              <button className="rounded border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={onSecondary}>
                {secondaryLabel}
              </button>
            ) : (
              <button className="rounded border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
