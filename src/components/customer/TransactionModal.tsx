import { CheckCircle2, Clock3, CreditCard, Landmark, LockKeyhole, Send, Upload, UserRound, Wallet, XCircle } from "lucide-react";
import { useState } from "react";
import { Field, inputClass } from "../common";
import { createTransaction, MIN_WITHDRAWAL_AMOUNT, validateWithdrawalRequest } from "../../services/transactionsService";
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
  const { state, dispatch } = useAppStore();
  const [amount, setAmount] = useState(type === "topup" ? 100000 : MIN_WITHDRAWAL_AMOUNT);
  const [amountInput, setAmountInput] = useState(String(type === "topup" ? 100000 : MIN_WITHDRAWAL_AMOUNT));
  const [senderName, setSenderName] = useState("");
  const [withdrawalBankName, setWithdrawalBankName] = useState("");
  const [withdrawalAccountName, setWithdrawalAccountName] = useState("");
  const [withdrawalAccountNumber, setWithdrawalAccountNumber] = useState("");
  const [withdrawalPassword, setWithdrawalPassword] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const activeBanks = banks.filter((bank) => bank.active);
  const minTopUp = activeBanks[0]?.minDeposit ?? 100000;
  const maxTopUp = 100000000;
  const currentMember = state.members.find((item) => item.username === member);
  const withdrawalBlockMessage =
    type === "withdraw" && currentMember ? validateWithdrawalRequest(currentMember, state.orders, amount) : "";
  const isPageVariant = variant === "page";

  const handleAmountChange = (value: string) => {
    setAmountInput(value);
    setAmount(parseIdrAmount(value));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (type === "withdraw" && currentMember) {
      const validationMessage = validateWithdrawalRequest(currentMember, state.orders, amount);
      if (validationMessage) {
        setMessage(`✗ ${validationMessage}`);
        return;
      }
    }

    if (amount < (type === "topup" ? minTopUp : MIN_WITHDRAWAL_AMOUNT)) {
      setMessage(type === "withdraw" ? "✗ Jumlah penarikan minimum adalah Rp100.000." : `✗ Jumlah minimum adalah Rp ${minTopUp.toLocaleString("id-ID")}`);
      return;
    }
    if (type === "topup" && amount > maxTopUp) {
      setMessage(`✗ Top-up maksimum adalah Rp ${maxTopUp.toLocaleString("id-ID")}`);
      return;
    }
    if (type === "topup" && !activeBanks.length) {
      setMessage("✗ Detail rekening belum tersedia. Silakan hubungi layanan pelanggan.");
      return;
    }
    if (type === "topup" && !senderName.trim()) {
      setMessage("✗Nama pengirim wajib diisi.");
      return;
    }
    if (type === "topup" && (!proofFile || !proofFile.type.startsWith("image/"))) {
      setMessage("✗ Unggah bukti gambar yang valid");
      return;
    }
    if (type === "withdraw" && (!withdrawalBankName.trim() || !withdrawalAccountName.trim() || !withdrawalAccountNumber.trim())) {
      setMessage("✗ Nama bank, pemilik rekening, dan nomor rekening wajib diisi");
      return;
    }
    if (type === "withdraw" && !withdrawalPassword.trim()) {
      setMessage("✗ Kata sandi penarikan wajib diisi");
      return;
    }

    if (!member) {
      setMessage("✗ Silakan masuk terlebih dahulu");
      return;
    }

    setLoading(true);
    setMessage("Mengirimkan permintaan...");

    try {
      const proofDataUrl = type === "topup" && proofFile ? await fileToDataUrl(proofFile) : undefined;
      const result = await createTransaction({
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
        submittedWithdrawalPassword: type === "withdraw" ? withdrawalPassword.trim() : undefined,
        proofName: type === "topup" ? proofFile?.name : undefined,
        proofType: type === "topup" ? proofFile?.type : undefined,
        proofDataUrl,
      });
      dispatch({ type: "addTransaction", payload: result.transaction });
      if (result.updatedMember) {
        dispatch({ type: "updateMember", payload: result.updatedMember });
      }

      setMessage(type === "withdraw" ? "✓ Penarikan telah diajukan. Saldo telah dipotong sembari menunggu peninjauan admin." : "✓ Permintaan telah diajukan! Menunggu persetujuan admin...");
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
      <form
        className={`w-full overflow-hidden bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)] ${
          isPageVariant
            ? "rounded-3xl"
            : "max-h-[calc(100vh-2rem)] max-w-4xl overflow-y-auto rounded-2xl sm:rounded-3xl"
        }`}
        onSubmit={handleSubmit}
      >
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${type === "topup" ? "bg-mint text-forest" : "bg-emerald-50 text-forest"}`}>
            {type === "topup" ? <CreditCard size={23} /> : <Wallet size={23} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-forest">{type === "topup" ? "Top Up" : "Withdrawal"}</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-slate-900 sm:text-2xl">{type === "topup" ? "Create Top Up Request" : "Create Withdrawal Request"}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">Kirimkan permintaan Anda untuk ditinjau oleh administrator. Permintaan yang sedang diproses akan muncul di riwayat akun Anda.</p>

          </div>
        </div>
      </div>

        <div
          className={`grid gap-4 p-4 sm:gap-5 sm:p-6 ${
            isPageVariant
              ? "lg:grid-cols-[minmax(0,1fr)_240px]"
              : "md:grid-cols-[minmax(0,1fr)_230px]"
          }`}
        >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 shrink-0" size={18} />
              <p className="font-bold">{type === "withdraw" ? "Jumlah penarikan langsung dipotong saat admin meninjau permintaan." : "Permintaan isi ulang Anda akan ditinjau oleh admin sebelum saldo berubah."}</p>
            </div>
          </div>

          {type === "topup" && (
            <div className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Informasi bank harian</p>
              {activeBanks.length ? (
                activeBanks.map((bank) => (
                    <div key={bank.id} className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                    <p className="text-xs font-bold uppercase text-slate-500">Nama bank</p>
                    <p className="font-black">{bank.bank}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-slate-500">Nama pemilik rekening</p>
                    <p>{bank.accountName}</p>
                    <p className="mt-2 text-xs font-bold uppercase text-slate-500">Nomor rekening</p>
                    <p className="font-bold text-forest">{bank.accountNumber}</p>
                  </div>
                ))
              ) : (
                <p className="mt-2 rounded-2xl bg-amber-50 p-3 text-sm font-bold text-amber-700">
                  Informasi rekening bank belum tersedia. Silakan hubungi layanan pelanggan.
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-slate-50 p-4">
            <Field label="Amount (Rp)">
              <input
                className={`${inputClass} rounded-xl bg-white`}
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(event) => handleAmountChange(event.target.value)}
                onBlur={() => setAmountInput(amount ? String(amount) : "")}
                placeholder="Example: 212,987"
                disabled={loading}
              />
            </Field>

            <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
              Minimum: {formatRupiah(type === "topup" ? minTopUp : MIN_WITHDRAWAL_AMOUNT)}
              {type === "topup" ? ` | Maximum: ${formatRupiah(maxTopUp)}` : ""}
            </div>
          </div>

          {type === "withdraw" && withdrawalBlockMessage && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">
              {withdrawalBlockMessage}
            </div>
          )}

          {type === "topup" && (
            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4">
              <Field label="Sender name">
                <input className={`${inputClass} rounded-xl`} value={senderName} onChange={(event) => setSenderName(event.target.value)} disabled={loading} />
              </Field>
              <Field label="Payment proof image">
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm font-bold text-slate-600 hover:border-forest hover:bg-mint">
                  <Upload size={18} className="text-forest" />
                  <span className="min-w-0 flex-1 truncate">{proofFile ? proofFile.name : "Upload image proof"}</span>
                  <input className="sr-only" type="file" accept="image/*" onChange={(event) => setProofFile(event.target.files?.[0] ?? null)} disabled={loading} />
                </label>
              </Field>
            </div>
          )}

          {type === "withdraw" && (
            <div className="grid gap-3 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                <p className="font-black">Tujuan penarikan</p>
                <p className="mt-1 leading-6">Masukkan rekening bank tempat dana penarikan yang telah disetujui akan disalurkan.</p>
              </div>

              <IconField icon={<Landmark size={17} />} label="Nama bank">
                <input className={`${inputClass} rounded-xl`} value={withdrawalBankName} onChange={(event) => setWithdrawalBankName(event.target.value)} disabled={loading} placeholder="Example: BCA, BRI, Mandiri" />
              </IconField>

              <IconField icon={<UserRound size={17} />} label="Nama pemegang rekening">
                <input className={`${inputClass} rounded-xl`} value={withdrawalAccountName} onChange={(event) => setWithdrawalAccountName(event.target.value)} disabled={loading} placeholder="Name on the bank account" />
              </IconField>

              <IconField icon={<CreditCard size={17} />} label="Nomor rekening">
                <input className={`${inputClass} rounded-xl`} value={withdrawalAccountNumber} onChange={(event) => setWithdrawalAccountNumber(event.target.value)} disabled={loading} inputMode="numeric" placeholder="Bank account number" />
              </IconField>

              <IconField icon={<LockKeyhole size={17} />} label="Kata sandi / PIN penarikan">
                <input
                  className={`${inputClass} rounded-xl`}
                  value={withdrawalPassword}
                  onChange={(event) => setWithdrawalPassword(event.target.value)}
                  disabled={loading}
                  type="password"
                  autoComplete="off"
                  placeholder="Masukkan kata sandi penarikan Anda"
                />
              </IconField>
            </div>
          )}

          {message && (
            <p
              className={`rounded-2xl p-3 text-sm font-semibold ${
                message.includes("✗") ? "bg-red-50 text-red-700" : message.includes("✓") ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <aside className="rounded-3xl bg-gradient-to-br from-forest to-emerald-600 p-5 text-white lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-black uppercase tracking-wide text-white/70">Jumlah permintaan</p>
          <p className="mt-2 break-words text-3xl font-black">{formatRupiah(amount)}</p>
          <div className="mt-5 space-y-3 text-sm">
            <SummaryItem label="Status" value={type === "withdraw" ? "Pending Withdrawal" : "Pending Top Up"} />
            <SummaryItem label="Member" value={member} />
            <SummaryItem label="Admin scope" value={admin} />
            {type === "withdraw" && withdrawalBankName && <SummaryItem label="Withdrawal bank" value={withdrawalBankName} />}
          </div>
        </aside>
      </div>

      <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
        <button className="rounded-2xl border border-slate-200 px-3 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50" type="button" onClick={onClose} disabled={loading}>
          Membatalkan
        </button>
        <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest px-3 py-3 font-bold text-white hover:bg-forest/90 disabled:bg-slate-400" type="submit" disabled={loading || Boolean(withdrawalBlockMessage)}>
          {loading ? (
            "Submitting..."
          ) : (
            <>
              {type === "withdraw" ? <Send size={17} /> : <CheckCircle2 size={17} />}
              {type === "withdraw" ? "Ajukan Penarikan" : "Ajukan Isi Saldo"}
            </>
          )}
        </button>
      </div>
    </form>
  );

    if (isPageVariant) return form;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 px-3 py-4 sm:px-4 sm:py-8">
        {form}
      </div>
    );
}

function IconField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-700">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-forest">{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
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

function parseIdrAmount(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? Number(digitsOnly) : 0;
}
