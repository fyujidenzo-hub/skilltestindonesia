import { AlertCircle } from "lucide-react";
import type { Member } from "../../types";
import { formatRupiah } from "../../utils";

interface WalletValidationProps {
  member: Member | null;
  requiredBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function WalletValidation({
  member,
  requiredBalance,
  onConfirm,
  onCancel,
  isLoading = false,
}: WalletValidationProps) {
  if (!member) return null;

  const currentBalance = member.balance;
  const isInsufficent = currentBalance < requiredBalance;
  const shortage = requiredBalance - currentBalance;

  if (!isInsufficent) {
    // Balance is sufficient, show confirmation
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
        <div className="w-full max-w-sm rounded bg-white p-6 shadow-panel">
          <h3 className="text-xl font-bold mb-4">Confirm Order Submission</h3>
          
          <div className="rounded bg-slate-50 p-4 mb-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Required Balance:</span>
              <span className="font-bold text-slate-900">{formatRupiah(requiredBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Your Balance:</span>
              <span className="font-bold text-emerald-700">{formatRupiah(currentBalance)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-600">Remaining:</span>
              <span className="font-bold text-slate-900">{formatRupiah(currentBalance - requiredBalance)}</span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-6">
            Your balance is sufficient to complete this order.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="rounded border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700 disabled:bg-slate-400"
            >
              {isLoading ? "Submitting..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Balance is insufficient
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow-panel">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="text-rose-600 flex-shrink-0 mt-1" size={24} />
          <h3 className="text-xl font-bold">Insufficient Balance</h3>
        </div>

        <div className="rounded bg-rose-50 p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Required Balance:</span>
            <span className="font-bold text-slate-900">{formatRupiah(requiredBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Your Balance:</span>
            <span className="font-bold text-rose-700">{formatRupiah(currentBalance)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-rose-200">
            <span className="text-sm font-bold text-slate-600">Shortage:</span>
            <span className="font-bold text-rose-700">{formatRupiah(shortage)}</span>
          </div>
        </div>

        <div className="rounded bg-amber-50 border border-amber-200 p-4 mb-6">
          <p className="text-sm text-amber-900">
            <span className="font-bold block mb-1">Saldo anda kurang sebesar {formatRupiah(shortage)}</span>
            Silahkan isi ulang saldo anda untuk menyelesaikan tugas pesanan ini.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="rounded border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-700"
          >
            Top Up Now
          </button>
        </div>
      </div>
    </div>
  );
}
