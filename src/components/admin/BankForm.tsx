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
        setMessage(isEditing ? "Memperbarui pengaturan bank..." : "Penempatan dana tabungan...");

        try {
          if (bank) {
            const updatedBank = { ...bank, ...form };
            await updateBank(bank.id, form);
            dispatch({ type: "updateBank", payload: updatedBank });
            setMessage("Pengaturan bank berhasil diperbarui.");
            onDone?.();
          } else {
            const savedBank = await createBank(form);
            dispatch({ type: "addBank", payload: savedBank });
            setForm({ bank: "", accountName: "", accountNumber: "", minDeposit: 100000, active: true });
            setMessage("Rekening bank berhasil disimpan.");
          }
        } catch (error) {
          console.error("Failed to save bank placement:", error);
          setMessage("Gagal menyimpan rekening bank.");
        } finally {
          setSaving(false);
        }
      }}
    >
      <input className={inputClass} placeholder="Nama bank" required value={form.bank} onChange={(event) => setForm({ ...form, bank: event.target.value })} />
      <input className={inputClass} placeholder="Nama pemilik rekening" required value={form.accountName} onChange={(event) => setForm({ ...form, accountName: event.target.value })} />
      <input className={inputClass} placeholder="Nomor rekening" required value={form.accountNumber} onChange={(event) => setForm({ ...form, accountNumber: event.target.value })} />
      <input className={inputClass} type="number" placeholder="Setoran minimum" required value={form.minDeposit} onChange={(event) => setForm({ ...form, minDeposit: Number(event.target.value) })} />
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
        Detail rekening aktif
      </label>
      {message && (
        <p className={`rounded px-3 py-2 text-sm font-semibold ${message.includes("Gagal") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      )}
      <button disabled={saving} className="rounded bg-forest px-4 py-2 font-bold text-white disabled:bg-slate-400">
        {saving ? "Menyimpan..." : isEditing ? "Perbarui pengaturan bank" : "Simpan bank"}
      </button>
    </form>
  );
}
