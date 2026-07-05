import { AlertCircle } from "lucide-react";
import type { Member } from "../../types";
import { formatRupiah } from "../../utils";

interface WalletValidationProps {
  member: Member | null;

  // Existing prop name kept so other files do not break.
  // This is treated as the order/task amount that the user's balance must cover.
  requiredBalance: number;

  // Optional. If parent passes the real commission, use it.
  // If not passed, fallback is 20% of order amount.
  commission?: number;

  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function WalletValidation({
  member,
  requiredBalance,
  commission,
  onConfirm,
  onCancel,
  isLoading = false,
}: WalletValidationProps) {
  if (!member) return null;

  const currentBalance = Number(member.balance ?? 0);
  const orderAmount = Number(requiredBalance ?? 0);

  // SAFETY:
  // User balance must be equal to or higher than the order amount before sending/completing.
  // The order amount is NOT deducted. It is only used as an eligibility requirement.
  const hasEnoughBalance = currentBalance >= orderAmount;
  const shortage = Math.max(orderAmount - currentBalance, 0);

  // SAFETY:
  // Product/order amount should NOT be deducted from user balance.
  // User earns commission only. If existing commission is provided, use it.
  // Otherwise use default 20% commission.
  const commissionAmount =
    typeof commission === "number" && commission > 0
      ? commission
      : Math.round(orderAmount * 0.2);

  const balanceAfterCompletion = currentBalance + commissionAmount;

  if (!hasEnoughBalance) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
        <div className="w-full max-w-sm rounded bg-white p-6 shadow-panel">
          <div className="mb-4 flex items-start gap-3">
            <AlertCircle className="mt-1 flex-shrink-0 text-rose-600" size={24} />
            <h3 className="text-xl font-bold">Top Up Required</h3>
          </div>

          <div className="mb-4 space-y-2 rounded bg-rose-50 p-4">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">Order Amount:</span>
              <span className="font-bold text-slate-900">
                {formatRupiah(orderAmount)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">Your Balance:</span>
              <span className="font-bold text-rose-700">
                {formatRupiah(currentBalance)}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-t border-rose-200 pt-2">
              <span className="text-sm font-bold text-slate-600">Shortage:</span>
              <span className="font-bold text-rose-700">
                {formatRupiah(shortage)}
              </span>
            </div>
          </div>

          <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
            Saldo Anda harus sama dengan atau lebih besar dari jumlah pesanan sebelum
              Anda dapat menyelesaikan tugas ini. Harap lakukan isi ulang terlebih dahulu.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50"
            >
              Membatalkan
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="rounded bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-700"
            >
              Isi Saldo Sekarang
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow-panel">
        <h3 className="mb-4 text-xl font-bold">Konfirmasi Pengiriman Pesanan</h3>

        <div className="mb-4 space-y-2 rounded bg-slate-50 p-4">
          <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-600">Jumlah Pesanan:</span>
            <span className="font-bold text-slate-900">
              {formatRupiah(orderAmount)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-600">Saldo Anda:</span>
            <span className="font-bold text-emerald-700">
              {formatRupiah(currentBalance)}
            </span>
          </div>

          <div className="flex justify-between gap-4">
            <span className="text-sm text-slate-600">Komisi yang Diperoleh:</span>
            <span className="font-bold text-emerald-700">
              + {formatRupiah(commissionAmount)}
            </span>
          </div>

          <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
            <span className="text-sm font-bold text-slate-600">
             Saldo Setelah Penyelesaian:
            </span>
            <span className="font-bold text-emerald-700">
              {formatRupiah(balanceAfterCompletion)}
            </span>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-600">
          Saldo Anda memenuhi syarat untuk pesanan ini. Jumlah pesanan tidak akan
          dipotong. Hanya komisi yang akan ditambahkan setelah pesanan selesai.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            Membatalkan
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:bg-slate-400"
          >
            {isLoading ? "Mengirim..." : "Konfirmasi"}
          </button>
        </div>
      </div>
    </div>
  );
}