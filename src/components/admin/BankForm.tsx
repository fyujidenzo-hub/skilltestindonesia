import { useState } from "react";
import { inputClass } from "../common";
import { createBank, updateBank } from "../../services/banksService";
import { useAppStore } from "../../store/AppStore";
import type { BankPlacement } from "../../types";

export default function BankForm({ bank, onDone }: { bank?: BankPlacement; onDone?: () => void }) {
  const { dispatch } = useAppStore();
  const [form, setForm] = useState<Omit<BankPlacement, "id">>({
    bank: bank?.bank ?? "",
    accountName: bank?.accountName ?? "",
    accountNumber: bank?.accountNumber ?? "",
    minDeposit: bank?.minDeposit ?? 100000,
    active: bank?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(bank);

  return (
    <form
      className="grid gap-3 rounded bg-slate-50 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setMessage(isEditing ? "Updating bank settings..." : "Saving bank placement...");

        try {
          if (bank) {
            const updatedBank = { ...bank, ...form };
            await updateBank(bank.id, form);
            dispatch({ type: "updateBank", payload: updatedBank });
            setMessage("Bank settings updated in Firebase.");
            onDone?.();
          } else {
            const savedBank = await createBank(form);
            dispatch({ type: "addBank", payload: savedBank });
            setForm({ bank: "", accountName: "", accountNumber: "", minDeposit: 100000, active: true });
            setMessage("Bank placement saved to Firebase.");
          }
        } catch (error) {
          console.error("Failed to save bank placement:", error);
          setMessage("Firebase save failed. Check Firestore bank rules.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <input className={inputClass} placeholder="Bank name" required value={form.bank} onChange={(event) => setForm({ ...form, bank: event.target.value })} />
      <input className={inputClass} placeholder="Account owner name" required value={form.accountName} onChange={(event) => setForm({ ...form, accountName: event.target.value })} />
      <input className={inputClass} placeholder="Account number" required value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} />
      <input className={inputClass} type="number" placeholder="Minimum deposit" required value={form.minDeposit} onChange={(event) => setForm({ ...form, minDeposit: Number(event.target.value) })} />
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
        Active bank details
      </label>
      {message && (
        <p className={`rounded px-3 py-2 text-sm font-semibold ${message.includes("failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      )}
      <button disabled={saving} className="rounded bg-forest px-4 py-2 font-bold text-white disabled:bg-slate-400">
        {saving ? "Saving..." : isEditing ? "Update bank settings" : "Save bank"}
      </button>
    </form>
  );
}
