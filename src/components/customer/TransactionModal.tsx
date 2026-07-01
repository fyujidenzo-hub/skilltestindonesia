import { CheckCircle2, Clock3, CreditCard, Upload, Wallet, XCircle } from "lucide-react";
import { useState } from "react";
import { Field, inputClass } from "../common";
import { createTransaction } from "../../services/transactionsService";
import { useAppStore } from "../../store/AppStore";
import type { BankPlacement } from "../../types";
import { formatRupiah } from "../../utils";

interface TransactionModalProps {
  type: "topup" | "withdraw";
  member: string;
  admin: string;
  banks: BankPlacement[];
  onClose: () => void;
  variant?: "modal" | "page";
}

export default function TransactionModal({ type, member, admin, banks, onClose, variant = "modal" }: TransactionModalProps) {
  const { dispatch } = useAppStore();
  const [amount, setAmount] = useState(type === "topup" ? 100000 : 50000);
  const [senderName, setSenderName] = useState("");
  const [withdrawalBankName, setWithdrawalBankName] = useState("");
  const [withdrawalAccountName, setWithdrawalAccountName] = useState("");
  const [withdrawalAccountNumber, setWithdrawalAccountNumber] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const activeBanks = banks.filter((bank) => bank.active);
  const minTopUp = activeBanks[0]?.minDeposit ?? 100000;
  const maxTopUp = 100000000;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (amount < (type === "topup" ? minTopUp : 10000)) {
      setMessage(`✗ Minimum amount is Rp ${(type === "topup" ? minTopUp : 10000).toLocaleString("id-ID")}`);
      return;
    }
    if (type === "topup" && amount > maxTopUp) {
      setMessage(`✗ Maximum top-up is Rp ${maxTopUp.toLocaleString("id-ID")}`);
      return;
    }
    if (type === "topup" && !activeBanks.length) {
      setMessage("✗ Bank details are not available yet. Please contact customer service.");
      return;
    }
    if (type === "topup" && !senderName.trim()) {
      setMessage("✗ Sender name is required");
      return;
    }
    if (type === "topup" && (!proofFile || !proofFile.type.startsWith("image/"))) {
      setMessage("✗ Upload a valid image proof");
      return;
    }
    if (type === "withdraw" && (!withdrawalBankName.trim() || !withdrawalAccountName.trim() || !withdrawalAccountNumber.trim())) {
      setMessage("✗ Bank name, account holder, and account number are required");
      return;
    }

    if (!member) {
      setMessage("✗ Please login first");
      return;
    }

    setLoading(true);
    setMessage("Submitting request...");

    try {
      const proofDataUrl = type === "topup" && proofFile ? await fileToDataUrl(proofFile) : undefined;
      const transaction = await createTransaction({
        member,
        admin,
        type: type === "withdraw" ? "withdrawal" : "topup",
        amount,
        status: "pending",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        senderName: type === "topup" ? senderName.trim() : undefined,
        withdrawalBankName: type === "withdraw" ? withdrawalBankName.trim() : undefined,
        withdrawalAccountName: type === "withdraw" ? withdrawalAccountName.trim() : undefined,
        withdrawalAccountNumber: type === "withdraw" ? withdrawalAccountNumber.trim() : undefined,
        proofName: type === "topup" ? proofFile?.name : undefined,
        proofType: type === "topup" ? proofFile?.type : undefined,
        proofDataUrl,
      });
      dispatch({ type: "addTransaction", payload: transaction });

      setMessage("✓ Request submitted! Awaiting admin approval...");
      setLoading(false);

      setTimeout(onClose, 2000);
    } catch (error) {
      setLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Request failed";
      setMessage(`✗ ${errorMessage}`);
      console.error("Request error:", error);
    }
  };

  const form = (
    <form className={`w-full rounded bg-white shadow-panel ${variant === "page" ? "p-5 sm:p-6" : "max-w-lg p-5"}`} onSubmit={handleSubmit}>
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded ${type === "topup" ? "bg-mint text-forest" : "bg-rose-50 text-coral"}`}>
          {type === "topup" ? <CreditCard size={23} /> : <Wallet size={23} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-forest">{type === "topup" ? "Top Up" : "Withdrawal"}</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{type === "topup" ? "Create Top Up Request" : "Create Withdrawal Request"}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Submit your request for administrator review. Pending requests will appear in your account history.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="grid gap-4">
          <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 shrink-0" size={18} />
              <p className="font-semibold">Your request will be reviewed by an admin before the balance changes.</p>
            </div>
          </div>

          {type === "topup" && (
            <div className="max-h-56 overflow-y-auto rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Daily bank information</p>
              {activeBanks.length ? (
                activeBanks.map((bank) => (
                  <div key={bank.id} className="mt-2 rounded border border-slate-200 bg-white p-3 text-sm">
                    <p className="text-xs font-bold uppercase text-slate-500">Bank name</p>
                    <p className="font-black">{bank.bank}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-slate-500">Account owner name</p>
                    <p>{bank.accountName}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-slate-500">Account number</p>
                    <p className="font-bold text-forest">{bank.accountNumber}</p>
                  </div>
                ))
              ) : (
                <p className="mt-2 rounded bg-amber-50 p-3 text-sm font-bold text-amber-700">
                  Bank details are not available yet. Please contact customer service.
                </p>
              )}
            </div>
          )}

          <Field label="Amount (Rp)">
            <input
              className={inputClass}
              type="number"
              min={10000}
              step={1000}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              disabled={loading}
            />
          </Field>

          <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Minimum: {formatRupiah(type === "topup" ? minTopUp : 10000)}
            {type === "topup" ? ` | Maximum: ${formatRupiah(maxTopUp)}` : ""} | Amount: <span className="font-bold text-slate-700">{formatRupiah(amount)}</span>
          </div>

          {type === "topup" && (
            <div className="grid gap-3">
              <Field label="Sender name">
                <input className={inputClass} value={senderName} onChange={(event) => setSenderName(event.target.value)} disabled={loading} />
              </Field>
              <Field label="Payment proof image">
                <label className="flex cursor-pointer items-center gap-3 rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-600 hover:border-forest hover:bg-mint">
                  <Upload size={18} className="text-forest" />
                  <span className="min-w-0 flex-1 truncate">{proofFile ? proofFile.name : "Upload image proof"}</span>
                  <input className="sr-only" type="file" accept="image/*" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} disabled={loading} />
                </label>
              </Field>
            </div>
          )}

          {type === "withdraw" && (
            <div className="grid gap-3">
              <div className="rounded border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-black">Withdrawal destination</p>
                <p className="mt-1 leading-6">Enter the bank account where the approved withdrawal should be released.</p>
              </div>
              <Field label="Bank name">
                <input className={inputClass} value={withdrawalBankName} onChange={(event) => setWithdrawalBankName(event.target.value)} disabled={loading} placeholder="Example: BCA, BRI, Mandiri" />
              </Field>
              <Field label="Account holder name">
                <input className={inputClass} value={withdrawalAccountName} onChange={(event) => setWithdrawalAccountName(event.target.value)} disabled={loading} placeholder="Name on the bank account" />
              </Field>
              <Field label="Account number">
                <input className={inputClass} value={withdrawalAccountNumber} onChange={(event) => setWithdrawalAccountNumber(event.target.value)} disabled={loading} inputMode="numeric" placeholder="Bank account number" />
              </Field>
            </div>
          )}

          {message && (
            <p
              className={`rounded p-3 text-sm font-semibold ${
                message.includes("✗") ? "bg-red-50 text-red-700" : message.includes("✓") ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <aside className="rounded bg-gradient-to-br from-forest to-emerald-600 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-wide text-white/70">Request amount</p>
          <p className="mt-2 break-words text-3xl font-black">{formatRupiah(amount)}</p>
          <div className="mt-5 space-y-3 text-sm">
            <SummaryItem label="Status" value="Pending review" />
            <SummaryItem label="Member" value={member} />
            <SummaryItem label="Admin scope" value={admin} />
            {type === "withdraw" && withdrawalBankName && <SummaryItem label="Withdrawal bank" value={withdrawalBankName} />}
          </div>
        </aside>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button className="rounded border border-slate-200 px-3 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50" type="button" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button className="rounded bg-forest px-3 py-3 font-bold text-white hover:bg-forest/90 disabled:bg-slate-400" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </div>
    </form>
  );

  if (variant === "page") return form;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/50 px-4 py-8">
      {form}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/10 px-3 py-2">
      <p className="text-[11px] font-black uppercase tracking-wide text-white/60">{label}</p>
      <p className="mt-1 break-words font-bold">{value}</p>
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read payment proof image."));
    reader.readAsDataURL(file);
  });
}
