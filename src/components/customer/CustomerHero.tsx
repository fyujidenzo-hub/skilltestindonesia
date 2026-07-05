import BalanceCard from "./BalanceCard";

interface CustomerHeroProps {
  balance: number;
  username?: string;
  phone?: string;
  onTopUp: () => void;
  onWithdraw: () => void;
}

const workAccountBanner = "/assets/work-account-banner.png";

export default function CustomerHero({ balance, username, phone, onTopUp, onWithdraw }: CustomerHeroProps) {
  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6">
        <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)] ring-1 ring-emerald-100/70">
          <img
            className="h-36 w-full object-cover sm:h-44 lg:h-52"
            src={workAccountBanner}
            alt="Tokopedia work account promotion"
          />

          <div className="bg-[linear-gradient(135deg,#047857_0%,#15945f_48%,#84cc16_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
              <div className="min-w-0">
                <p className="text-lg font-semibold text-white/90 sm:text-2xl">Selamat datang di akun kerja Tokopedia,</p>
                <h1 className="mt-2 break-words text-4xl font-black leading-tight sm:text-5xl">
                  {username || "Guest User"}
                </h1>
                <p className="mt-2 break-words text-xl font-bold text-white/95 sm:text-2xl">
                  {phone || "Please log in to view your user number"}
                </p>
              </div>
              <BalanceCard balance={balance} onTopUp={onTopUp} onWithdraw={onWithdraw} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
