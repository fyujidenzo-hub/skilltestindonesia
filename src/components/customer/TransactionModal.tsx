import { useState } from "react";
import { Field, inputClass } from "../common";
import { createTransaction } from "../../services/transactionsService";
import { useAppStore } from "../../store/AppStore";
import type { BankPlacement } from "../../types";

interface TransactionModalProps {
  type: "topup" | "withdraw";
  member: string;
  admin: string;
  banks: BankPlacement[];
  onClose: () => void;
}

export default function TransactionModal({ type, member, admin, banks, onClose }: TransactionModalProps) {
  const { dispatch } = useAppStore();
  const [amount, setAmount] = useState(type === "topup" ? 100000 : 50000);
  const [senderName, setSenderName] = useState("");
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
    if (type === "topup" && !senderName.trim()) {
      setMessage("✗ Sender name is required");
      return;
    }
    if (type === "topup" && (!proofFile || !proofFile.type.startsWith("image/"))) {
      setMessage("✗ Upload a valid image proof");
      return;
    }

    if (!member) {
      setMessage("✗ Please login first");
      return;
    }

    setLoading(true);
    setMessage("Submitting request...");

    try {
      const transaction = await createTransaction({
        member,
        admin,
        type: type === "withdraw" ? "withdrawal" : "topup",
        amount,
        status: "pending",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        senderName: type === "topup" ? senderName.trim() : undefined,
        proofName: type === "topup" ? proofFile?.name : undefined,
        proofType: type === "topup" ? proofFile?.type : undefined,
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <form className="w-full max-w-sm rounded bg-white p-5 shadow-panel" onSubmit={handleSubmit}>
        <h2 className="text-xl font-black capitalize">{type === "topup" ? "Top Up Request" : "Request Withdrawal"}</h2>

        <div className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-700">
          ⏳ Your request will be reviewed by an admin for approval
        </div>
        {type === "topup" && (
          <div className="mt-3 max-h-40 overflow-y-auto rounded bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase text-slate-500">Daily bank information</p>
            {activeBanks.length ? (
              activeBanks.map((bank) => (
                <div key={bank.id} className="mt-2 rounded border border-slate-200 bg-white p-3 text-sm">
                  <p className="font-black">{bank.bank}</p>
                  <p>{bank.accountName}</p>
                  <p className="font-bold text-forest">{bank.accountNumber}</p>
                </div>
              ))
            ) : (
              <p className="mt-2 text-sm text-slate-500">No active bank placement yet. Contact support before topping up.</p>
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

        <div className="text-xs text-slate-500">
          Minimum: Rp {(type === "topup" ? minTopUp : 10000).toLocaleString("id-ID")} {type === "topup" ? `| Maximum: Rp ${maxTopUp.toLocaleString("id-ID")}` : ""} | Amount: <span className="font-bold text-slate-700">Rp {amount.toLocaleString("id-ID")}</span>
        </div>
        {type === "topup" && (
          <div className="mt-3 grid gap-3">
            <Field label="Sender name">
              <input className={inputClass} value={senderName} onChange={(event) => setSenderName(event.target.value)} disabled={loading} />
            </Field>
            <Field label="Payment proof image">
              <input className="rounded border border-slate-200 px-3 py-2 text-sm" type="file" accept="image/*" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} disabled={loading} />
            </Field>
          </div>
        )}

        {message && (
          <p
            className={`mt-3 rounded p-3 text-sm font-semibold ${
              message.includes("✗") ? "bg-red-50 text-red-700" : message.includes("✓") ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
            }`}
          >
            {message}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button className="rounded border border-slate-200 px-3 py-2 font-bold disabled:opacity-50" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="rounded bg-forest px-3 py-2 font-bold text-white disabled:bg-slate-400" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
