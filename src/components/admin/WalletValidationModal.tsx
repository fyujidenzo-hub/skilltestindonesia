import type { Member } from "../../types";
import { formatRupiah } from "../../utils";

interface WalletValidationProps {
  member: Member | null;
  orderAmount: number;
  commission: number;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function WalletValidation({
  member,
  orderAmount,
  commission,
  onConfirm,
  onCancel,
  isLoading = false,
}: WalletValidationProps) {
  if (!member) return null;

  const currentBalance = Number(member.balance ?? 0);
  const commissionAmount = Number(commission ?? 0);

  return (
 <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-sm rounded bg-white p-6 shadow-panel">
        <h3 className="text-xl font-bold mb-4">Konfirmasi Pengajuan Pesanan</h3>

        <div className="rounded bg-slate-50 p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Nilai Pesanan:</span>
            <span className="font-bold text-slate-900">{formatRupiah(orderAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Saldo Anda:</span>
            <span className="font-bold text-slate-900">{formatRupiah(currentBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-600">Komisi yang Diperoleh:</span>
            <span className="font-bold text-emerald-700">+ {formatRupiah(commissionAmount)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-600">Saldo Setelah Penyelesaian:</span>
            <span className="font-bold text-emerald-700">{formatRupiah(currentBalance + commissionAmount)}</span>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          Harga produk hanya digunakan sebagai nilai pesanan. Saldo Anda tidak akan dipotong; hanya komisi yang akan ditambahkan setelah penyelesaian.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded border border-slate-200 px-4 py-2 font-bold hover:bg-slate-50 disabled:opacity-50"
          >
           Membatalkan
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
