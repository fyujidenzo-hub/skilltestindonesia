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
      <div className="mx-auto max-w-7xl px-4 pb-5 pt-4 sm:px-6 sm:pb-7">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)] ring-1 ring-white/80">
          <img
            className="h-32 w-full object-cover sm:h-44 lg:h-56"
            src={workAccountBanner}
            alt="Tokopedia work account promotion"
          />

          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#047857_0%,#15945f_48%,#84cc16_100%)] px-5 py-7 text-white sm:px-7 lg:px-9">
            <div className="absolute right-0 top-0 h-40 w-40 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute bottom-0 left-1/2 h-32 w-56 translate-y-1/2 rounded-full bg-lime-200/20 blur-3xl" />
            <div className="relative grid gap-6 lg:grid-cols-[1fr_370px] lg:items-end">
              <div className="min-w-0">
                <p className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90 ring-1 ring-white/20">
                  Akun kerja aktif
                </p>
                <p className="mt-4 text-lg font-semibold text-white/90 sm:text-2xl">Selamat datang di akun kerja Tokopedia,</p>
                <h1 className="mt-2 break-words text-4xl font-black leading-none sm:text-6xl">
                  {username || "Guest User"}
                </h1>
                <p className="mt-3 break-words text-base font-bold text-white/90 sm:text-2xl">
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
