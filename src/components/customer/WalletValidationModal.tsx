import type { Member } from "../../types";
import { formatRupiah } from "../../utils";

interface WalletValidationProps {
  member: Member | null;

  // Existing prop name kept so other files do not break.
  // This is now treated as the order amount/reference amount, NOT a required balance deduction.
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

  // SAFETY: Product/order amount should NOT be deducted from user balance.
  // User earns commission only. If existing commission is provided, use it.
  // Otherwise use default 20% commission.
  const commissionAmount =
    typeof commission === "number" && commission > 0
      ? commission
      : Math.round(orderAmount * 0.2);

  const balanceAfterCompletion = currentBalance + commissionAmount;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow-panel">
        <h3 className="mb-4 text-xl font-bold">Confirm Order Submission</h3>

        <div className="mb-4 space-y-2 rounded bg-slate-50 p-4">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Order Amount:</span>
            <span className="font-bold text-slate-900">
              {formatRupiah(orderAmount)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Your Balance:</span>
            <span className="font-bold text-slate-900">
              {formatRupiah(currentBalance)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Commission Earned:</span>
            <span className="font-bold text-emerald-700">
              + {formatRupiah(commissionAmount)}
            </span>
          </div>

          <div className="flex justify-between border-t border-slate-200 pt-2">
            <span className="text-sm font-bold text-slate-600">
              Balance After Completion:
            </span>
            <span className="font-bold text-emerald-700">
              {formatRupiah(balanceAfterCompletion)}
            </span>
          </div>
        </div>

        <p className="mb-6 text-sm text-slate-600">
          The product amount is only used as the order reference. Your balance will not be deducted. Only the commission will be added after the order is completed.
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