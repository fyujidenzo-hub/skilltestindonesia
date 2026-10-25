import { BadgeCheck, Copy, KeyRound, Link2, Send, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import { Field, inputClass, Panel } from "../common";
import { roleLabel } from "../../services/adminSession";
import { updateAdminProfile } from "../../services/adminsService";
import { updateSettings } from "../../services/settingsService";
import { useAppStore } from "../../store/AppStore";
import type { StaffAdmin } from "../../types";
import { updateCurrentAccountPassword } from "../../services/authService";
import { getPublicSiteUrl } from "../../services/siteUrl";

export default function AccountPanel({ activeAdmin }: { activeAdmin: StaffAdmin }) {
  const { state, dispatch } = useAppStore();
  const [form, setForm] = useState({
    name: activeAdmin.name,
    username: activeAdmin.username ?? "",
    password: "",
    confirmPassword: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    siteUrl: state.account.siteUrl ?? "",
    customerServiceTelegramUrl: state.account.customerServiceTelegramUrl ?? "",
  });
  const [message, setMessage] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const inviteCode = activeAdmin.invitationCode ?? activeAdmin.code;
  const adminCode = activeAdmin.adminCode ?? activeAdmin.code;
  const siteUrl = getPublicSiteUrl(state.account.siteUrl);
  const inviteLink = `${siteUrl}/register?code=${inviteCode}`;

  const saveProfile = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      setMessage("Nama dan nama pengguna wajib diisi.");
      return;
    }

    if (form.password || form.confirmPassword) {
      if (form.password.length < 6) {
        setMessage("Kata sandi harus memiliki minimal 6 karakter.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setMessage("Konfirmasi kata sandi tidak cocok.");
        return;
      }
    }

    setSaving(true);
    setMessage("Menyimpan akun...");
    try {
      const updatedAdmin = await updateAdminProfile(activeAdmin, form.name.trim(), form.username.trim());
      if (form.password) await updateCurrentAccountPassword(form.password);
      dispatch({ type: "updateAdmin", payload: updatedAdmin });
      setForm((current) => ({ ...current, password: "", confirmPassword: "" }));
      setMessage("Akun admin berhasil diperbarui. Gunakan nama pengguna atau kata sandi baru saat masuk berikutnya.");
    } catch (error) {
      console.error("Failed to update admin account:", error);
      setMessage("Gagal menyimpan perubahan akun admin.");
    } finally {
      setSaving(false);
    }
  };

  const saveWhiteLabelSettings = async () => {
    const nextSiteUrl = normalizeUrl(settingsForm.siteUrl);
    const nextTelegramUrl = normalizeUrl(settingsForm.customerServiceTelegramUrl);

    if (!nextSiteUrl) {
      setSettingsMessage("Tautan situs web wajib diisi.");
      return;
    }

    setSavingSettings(true);
    setSettingsMessage("Menyimpan pengaturan...");
    try {
      const nextAccount = {
        ...state.account,
        siteUrl: nextSiteUrl,
        customerServiceTelegramUrl: nextTelegramUrl,
      };
      await updateSettings({
        siteUrl: nextSiteUrl,
        customerServiceTelegramUrl: nextTelegramUrl,
      });
      dispatch({ type: "updateAccount", payload: nextAccount });
      setSettingsForm({
        siteUrl: nextSiteUrl,
        customerServiceTelegramUrl: nextTelegramUrl,
      });
      setSettingsMessage("Tautan situs web dan layanan pelanggan berhasil diperbarui.");
    } catch (error) {
      console.error("Failed to update settings:", error);
      setSettingsMessage("Gagal menyimpan pengaturan.");
    } finally {
      setSavingSettings(false);
    }
  };

  const copyInviteLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setMessage("Tautan undangan berhasil disalin.");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <Panel title="Akun Admin yang Sedang Masuk">
        <div className="rounded bg-gradient-to-br from-slate-900 to-emerald-800 p-5 text-white">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded bg-white/15">
              <ShieldCheck size={26} />
            </div>
            <div className="min-w-0">
              <p className="break-words text-2xl font-black">{activeAdmin.name}</p>
              <p className="mt-1 text-sm font-bold text-emerald-100">{roleLabel(activeAdmin.role)}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoPill label="Kode admin" value={adminCode} />
            <InfoPill label="Kode undangan" value={inviteCode} />
          </div>
        </div>

        <div className="mt-4 rounded bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <Link2 className="mt-0.5 shrink-0 text-forest" size={18} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase text-slate-500">Tautan pendaftaran</p>
              <p className="mt-1 break-all text-sm font-black text-forest">{inviteLink}</p>
            </div>
          </div>
          <button className="mt-3 inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-black text-white" onClick={copyInviteLink}>
            <Copy size={15} />
            Salin tautan
          </button>
        </div>
      </Panel>

      <Panel title="Kredensial Masuk">
        <div className="grid gap-4">
          <Field label="Nama tampilan">
            <div className="relative">
              <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input className={`${inputClass} w-full pl-10`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>
          </Field>

          <Field label="Nama pengguna admin">
            <div className="relative">
              <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
              <input className={`${inputClass} w-full pl-10`} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kata sandi baru">
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className={`${inputClass} w-full pl-10`} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Kosongkan untuk mempertahankan kata sandi saat ini" />
              </div>
            </Field>
            <Field label="Konfirmasi kata sandi">
              <input className={`${inputClass} w-full`} type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Ulangi kata sandi baru" />
            </Field>
          </div>
        </div>

        <button className="mt-5 rounded bg-forest px-4 py-3 text-sm font-black text-white disabled:bg-slate-400" disabled={saving} onClick={saveProfile}>
          {saving ? "Menyimpan..." : "Simpan akun admin"}
        </button>

        {message && (
          <p className={`mt-4 rounded px-3 py-2 text-sm font-bold ${message.includes("Gagal") || message.includes("wajib") || message.includes("tidak cocok") || message.includes("minimal") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {message}
          </p>
        )}
      </Panel>

      {activeAdmin.role === "super_admin" && (
        <Panel title="Pengaturan Merek Situs">
          <div className="grid gap-4">
            <Field label="Tautan situs web">
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className={`${inputClass} w-full pl-10`} value={settingsForm.siteUrl} onChange={(event) => setSettingsForm({ ...settingsForm, siteUrl: event.target.value })} placeholder="https://your-domain.com" />
              </div>
            </Field>

            <Field label="Tautan Telegram layanan pelanggan">
              <div className="relative">
                <Send className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input className={`${inputClass} w-full pl-10`} value={settingsForm.customerServiceTelegramUrl} onChange={(event) => setSettingsForm({ ...settingsForm, customerServiceTelegramUrl: event.target.value })} placeholder="https://t.me/your_support" />
              </div>
            </Field>
          </div>

          <button className="mt-5 w-full rounded bg-forest px-4 py-3 text-sm font-black text-white disabled:bg-slate-400 sm:w-auto" disabled={savingSettings} onClick={saveWhiteLabelSettings}>
            {savingSettings ? "Menyimpan..." : "Simpan pengaturan"}
          </button>

          {settingsMessage && (
            <p className={`mt-4 rounded px-3 py-2 text-sm font-bold ${settingsMessage.includes("Gagal") || settingsMessage.includes("wajib") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {settingsMessage}
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}

function normalizeUrl(value?: string) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed.replace(/\/+$/, "") : `https://${trimmed.replace(/\/+$/, "")}`;
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/10 p-3 ring-1 ring-white/10">
      <p className="text-xs font-black uppercase text-emerald-100">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
