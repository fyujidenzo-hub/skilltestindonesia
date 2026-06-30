import { Send } from "lucide-react";
import type { Navigate } from "../App";
import BottomNavbar from "../components/customer/BottomNavbar";
import CustomerHeader from "../components/customer/CustomerHeader";
import { clearActiveCustomerId, getActiveCustomerId } from "../services/customerSession";
import { useAppStore } from "../store/AppStore";

export default function CustomerServicePage({ navigate }: { navigate: Navigate }) {
  const { state } = useAppStore();
  const activeCustomerId = getActiveCustomerId();
  const currentMember = activeCustomerId ? state.members.find((member) => member.id === activeCustomerId) : undefined;

  return (
    <main className="min-h-screen bg-[#f4f6f5] pb-24 text-ink">
      <CustomerHeader
        query=""
        activeUsername={currentMember?.username}
        notifications={[]}
        onQueryChange={() => undefined}
        onLogout={() => {
          clearActiveCustomerId();
          navigate("/login");
        }}
        navigate={navigate}
      />

      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <button className="mb-5 text-sm font-bold text-forest hover:underline" onClick={() => navigate("/")}>
          Back to store
        </button>

        <div className="rounded bg-white p-5 shadow-panel sm:p-7">
          <div className="rounded bg-forest p-5 text-white">
            <h1 className="text-xl font-black sm:text-2xl">Dedicated Customer Service</h1>
            <p className="mt-4 text-sm leading-7 text-emerald-50">
              Notice to all users: the task/order completion time is 2 hours. Complete orders within the specified time limit. If you exceed the time limit, your account balance may be frozen. Top ups and withdrawals outside 09:00 WIB - 21:00 WIB require permission from our Customer Service team. If there is a problem with your transaction, please contact Customer Service immediately.
            </p>
          </div>

          <div className="mt-6 rounded bg-white p-6 text-center shadow-panel ring-1 ring-slate-100">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-sky-50 text-sky-500">
              <Send size={34} />
            </div>
            <p className="mt-4 text-base font-black text-slate-800">Customer Service</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">09:00 WIB - 21:00 WIB</p>
          </div>
        </div>
      </section>

      <BottomNavbar isLoggedIn={Boolean(activeCustomerId)} navigate={navigate} active="service" />
    </main>
  );
}
