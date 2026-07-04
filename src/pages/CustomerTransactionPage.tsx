import { ArrowLeft, CreditCard, Wallet } from "lucide-react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import TransactionModal from "../components/customer/TransactionModal";
import { getActiveCustomer } from "../services/customerSession";
import { useAppStore } from "../store/AppStore";

export default function CustomerTransactionPage({ navigate, type }: { navigate: Navigate; type: "topup" | "withdraw" }) {
  const { state, ready } = useAppStore();
  const member = getActiveCustomer(state.members);

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg px-4 text-ink">
        <div className="rounded bg-white px-6 py-5 text-sm font-bold text-slate-600 shadow-panel">Restoring member session...</div>
      </main>
    );
  }

  if (!member) {
    return (
      <main className="grid min-h-screen place-items-center customer-page-bg px-4 text-ink">
        <section className="w-full max-w-md rounded bg-white p-6 text-center shadow-panel">
          <h1 className="text-2xl font-black">Login required</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Please log in before creating a {type === "topup" ? "top up" : "withdrawal"} request.</p>
          <button className="mt-5 h-11 w-full rounded bg-forest font-bold text-white" onClick={() => navigate("/login")}>
            Go to login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen customer-page-bg pb-24 text-ink">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <button className="inline-flex items-center gap-2 text-sm font-bold text-forest" onClick={() => navigate("/profile")}>
            <ArrowLeft size={18} />
            Back to profile
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-5 overflow-hidden rounded bg-white shadow-panel">
          <div className={`p-6 text-white ${type === "topup" ? "bg-gradient-to-r from-forest to-emerald-500" : "bg-gradient-to-r from-slate-900 to-coral"}`}>
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-white/15">
                {type === "topup" ? <CreditCard size={24} /> : <Wallet size={24} />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-white/70">{type === "topup" ? "Top Up" : "Withdraw"}</p>
                <h1 className="mt-1 text-3xl font-black">{type === "topup" ? "Create a Top Up Request" : "Create a Withdrawal Request"}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                  Submit the amount and required details. Admin approval is required before your account balance changes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <TransactionModal
          type={type}
          member={member.username}
          admin={member.referredBy}
          banks={state.banks}
          onClose={() => navigate("/profile")}
          variant="page"
        />
      </section>
      <BottomNavbar isLoggedIn navigate={navigate} active="profile" />
    </main>
  );
}
