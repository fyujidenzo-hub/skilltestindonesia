import { AlertTriangle, BadgeDollarSign, Copy, Plus, RefreshCw, ShieldCheck, Trash2, UserRound, Users, X } from "lucide-react";
import { useState } from "react";
import { Field, inputClass, Panel, Select } from "../common";
import { createStaffAccount, deleteStaffAccount } from "../../services/adminSecurityService";
import { roleLabel } from "../../services/adminSession";
import { useAppStore } from "../../store/AppStore";
import type { AdminRole, StaffAdmin } from "../../types";
import { formatRupiah } from "../../utils";

function generateInviteCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function StaffPanel({ admins }: { admins: StaffAdmin[] }) {
  const { dispatch } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingStaffId, setDeletingStaffId] = useState("");
  const [staffToDelete, setStaffToDelete] = useState<StaffAdmin | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    adminCode: generateInviteCode(),
    invitationCode: generateInviteCode(),
    registrationBonus: 0,
    role: "admin" as Exclude<AdminRole, "super_admin">,
  });
  const superAdmins = admins.filter((admin) => admin.role === "super_admin").length;
  const regularAdmins = admins.filter((admin) => admin.role === "admin").length;
  const employees = admins.filter((admin) => admin.role === "employee").length;
  const totalRegistrations = admins.reduce((sum, admin) => sum + admin.registrations, 0);

  const saveStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("Menyimpan akun staf...");

    const duplicate = admins.find(
      (admin) =>
        admin.username === form.username ||
        admin.code === form.invitationCode ||
        admin.invitationCode === form.invitationCode ||
        admin.adminCode === form.adminCode,
    );
    if (duplicate) {
      setSaving(false);
      setMessage("Nama pengguna atau kode undangan sudah digunakan.");
      return;
    }

    try {
      const staff = await createStaffAccount({
        name: form.name,
        adminCode: form.adminCode,
        invitationCode: form.invitationCode,
        registrationBonus: form.registrationBonus,
        username: form.username,
        password: form.password,
        role: form.role,
      });
      dispatch({ type: "addAdmin", payload: staff });
      setForm({ name: "", username: "", password: "", adminCode: generateInviteCode(), invitationCode: generateInviteCode(), registrationBonus: 0, role: "admin" });
      setMessage("Akun staf berhasil disimpan.");
      setShowForm(false);
    } catch (error) {
      console.error("Failed to save staff account:", error);
      setMessage(error instanceof Error ? error.message : "Akun staf tidak dapat disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteStaff = async () => {
    if (!staffToDelete) return;

    if (staffToDelete.role === "super_admin") {
      setMessage("Akun Super Admin dilindungi dan tidak dapat dihapus.");
      setStaffToDelete(null);
      return;
    }

    setDeletingStaffId(staffToDelete.id);
    setMessage("Menghapus akun staf...");

    try {
      await deleteStaffAccount(staffToDelete.id);
      dispatch({ type: "deleteAdmin", payload: { id: staffToDelete.id } });
      setMessage("Akun staf berhasil dihapus.");
      setStaffToDelete(null);
    } catch (error) {
      console.error("Failed to delete staff account:", error);
      setMessage(error instanceof Error ? error.message : "Akun staf tidak dapat dihapus.");
    } finally {
      setDeletingStaffId("");
    }
  };

  return (
    <Panel
      title="Akun Admin & Karyawan"
      action={
        <button className="inline-flex items-center gap-2 rounded bg-forest px-3 py-2 text-sm font-semibold text-white" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          Tambah staf
        </button>
      }
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StaffSummary icon={<ShieldCheck />} label="Super Admin" value={String(superAdmins)} tone="slate" />
        <StaffSummary icon={<Users />} label="Admin" value={String(regularAdmins)} tone="green" />
        <StaffSummary icon={<UserRound />} label="Karyawan" value={String(employees)} tone="blue" />
        <StaffSummary icon={<BadgeDollarSign />} label="Pendaftaran" value={String(totalRegistrations)} tone="amber" />
      </div>

      {message && (
        <p className={`mb-5 rounded px-3 py-2 text-sm font-semibold ${message.includes("Gagal") || message.includes("sudah digunakan") || message.includes("tidak dapat") || message.includes("dilindungi") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {message}
        </p>
      )}

      {showForm && (
        <form className="mb-5 grid gap-4 rounded bg-slate-50 p-4" onSubmit={saveStaff}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nama tampilan">
              <input className={inputClass} required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Admin 4" />
            </Field>
            <Field label="Peran">
              <Select value={form.role} onChange={(role) => setForm({ ...form, role: role as Exclude<AdminRole, "super_admin"> })} options={["admin", "employee"]} />
            </Field>
            <Field label="Nama pengguna">
              <input className={inputClass} required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="admin4" />
            </Field>
            <Field label="Kata sandi">
              <input className={inputClass} required type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Kata sandi" />
            </Field>
          </div>

          <Field label="Kode admin">
            <div className="flex gap-2">
              <input className={`${inputClass} min-w-0 flex-1`} required value={form.adminCode} onChange={(event) => setForm({ ...form, adminCode: event.target.value.replace(/\D/g, "").slice(0, 6) })} />
              <button type="button" className="shrink-0 rounded bg-slate-200 px-3 py-2 text-sm font-bold text-slate-700" onClick={() => setForm({ ...form, adminCode: generateInviteCode() })}>
                <RefreshCw size={15} />
              </button>
            </div>
          </Field>

          <Field label="Kode undangan">
            <div className="flex gap-2">
              <input className={`${inputClass} min-w-0 flex-1`} required value={form.invitationCode} onChange={(event) => setForm({ ...form, invitationCode: event.target.value.replace(/\D/g, "").slice(0, 6) })} />
              <button type="button" className="shrink-0 rounded bg-slate-200 px-3 py-2 text-sm font-bold text-slate-700" onClick={() => setForm({ ...form, invitationCode: generateInviteCode() })}>
                <RefreshCw size={15} />
              </button>
            </div>
          </Field>

          <Field label="Bonus pendaftaran (IDR)">
            <input className={inputClass} type="number" min={0} value={form.registrationBonus || ""} onChange={(event) => setForm({ ...form, registrationBonus: Number(event.target.value) || 0 })} placeholder="0" />
          </Field>

          <button disabled={saving} className="rounded bg-forest px-4 py-3 font-bold text-white disabled:bg-slate-400">
            {saving ? "Menyimpan..." : "Simpan akun staf"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-slate-800">Daftar staf</p>
            <p className="text-xs font-semibold text-slate-500">Kelola akses masuk, kode undangan, dan kinerja harian.</p>
          </div>
          <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
            {admins.length} akun
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <StaffTh>Akun</StaffTh>
                <StaffTh>Peran</StaffTh>
                <StaffTh>Nama pengguna</StaffTh>
                <StaffTh>Kode admin</StaffTh>
                <StaffTh>Kode undangan</StaffTh>
                <StaffTh>Bonus pendaftaran</StaffTh>
                <StaffTh>Pendaftaran</StaffTh>
                <StaffTh>Deposit hari ini</StaffTh>
                <StaffTh>Tindakan</StaffTh>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => {
                const protectedAccount = admin.role === "super_admin";
                const deleting = deletingStaffId === admin.id;

                return (
                  <tr key={admin.id} className="group">
                    <StaffTd>
                      <div className="flex items-center gap-3">
                        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded text-sm font-black ${roleTone(admin.role).avatar}`}>
                          {initials(admin.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-900">{admin.name}</p>
                          <p className="text-xs font-semibold text-slate-500">ID {admin.id}</p>
                        </div>
                      </div>
                    </StaffTd>
                    <StaffTd>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ${roleTone(admin.role).badge}`}>
                        {roleLabel(admin.role)}
                      </span>
                    </StaffTd>
                    <StaffTd>
                      <span className="font-bold text-slate-700">{admin.username ?? "-"}</span>
                    </StaffTd>
                    <StaffTd>
                      <CodePill value={admin.adminCode ?? admin.code} />
                    </StaffTd>
                    <StaffTd>
                      <CodePill value={admin.invitationCode ?? admin.code} accent />
                    </StaffTd>
                    <StaffTd className="font-black text-slate-800">{formatRupiah(admin.registrationBonus ?? 0)}</StaffTd>
                    <StaffTd>
                      <span className="rounded bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{admin.registrations}</span>
                    </StaffTd>
                    <StaffTd className="font-black text-emerald-700">{formatRupiah(admin.todayDeposits)}</StaffTd>
                    <StaffTd>
                      {protectedAccount ? (
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">Dilindungi</span>
                      ) : (
                        <button
                          type="button"
                          disabled={deleting}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white transition hover:bg-rose-700 disabled:bg-slate-400"
                          onClick={() => setStaffToDelete(admin)}
                        >
                          <Trash2 size={14} />
                          {deleting ? "Menghapus..." : "Hapus"}
                        </button>
                      )}
                    </StaffTd>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {staffToDelete && (
        <DeleteStaffModal
          staff={staffToDelete}
          isDeleting={deletingStaffId === staffToDelete.id}
          onCancel={() => setStaffToDelete(null)}
          onConfirm={handleConfirmDeleteStaff}
        />
      )}
    </Panel>
  );
}

function DeleteStaffModal({ staff, isDeleting, onCancel, onConfirm }: { staff: StaffAdmin; isDeleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 px-3 py-4 sm:items-center sm:px-4">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-panel sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-rose-600">Hapus akun staf</p>
              <h3 className="mt-1 text-xl font-black leading-tight text-slate-900">Hapus {staff.name}?</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">Akun ini tidak akan dapat masuk lagi ke sistem admin.</p>
            </div>
          </div>

          <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={onCancel} disabled={isDeleting} aria-label="Tutup konfirmasi penghapusan">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 p-5 text-sm">
          <DeleteDetail label="Nama" value={staff.name} />
          <DeleteDetail label="Peran" value={roleLabel(staff.role)} />
          <DeleteDetail label="Nama pengguna" value={staff.username || "-"} />
          <DeleteDetail label="Kode admin" value={staff.adminCode ?? staff.code} />
          <DeleteDetail label="Kode undangan" value={staff.invitationCode ?? staff.code} />

          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-bold leading-6 text-rose-700">
            Tindakan ini tidak dapat dibatalkan. Anggota dan transaksi yang sudah ada akan tetap tersimpan, tetapi akses masuk staf ini akan dihapus.
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-100 p-5 sm:grid-cols-2">
          <button type="button" className="rounded-2xl border border-slate-200 px-4 py-3 font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60" onClick={onCancel} disabled={isDeleting}>
            Batal
          </button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 font-black text-white hover:bg-rose-700 disabled:bg-slate-400" onClick={onConfirm} disabled={isDeleting}>
            <Trash2 size={17} />
            {isDeleting ? "Menghapus..." : "Hapus akun"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words font-black text-slate-900">{value}</p>
    </div>
  );
}

function StaffSummary({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "slate" | "green" | "blue" | "amber" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700 ring-slate-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    blue: "bg-sky-50 text-sky-700 ring-sky-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
  }[tone];

  return (
    <div className={`rounded p-4 ring-1 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-75">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded bg-white/70">{icon}</span>
      </div>
    </div>
  );
}

function StaffTh({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-black first:pl-5">{children}</th>;
}

function StaffTd({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border-b border-slate-100 px-4 py-4 align-middle group-hover:bg-slate-50 first:pl-5 ${className}`}>{children}</td>;
}

function CodePill({ value, accent = false }: { value: string; accent?: boolean }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-black ${accent ? "bg-emerald-50 text-forest" : "bg-slate-100 text-slate-700"}`}
      onClick={() => navigator.clipboard.writeText(value)}
      title="Salin kode"
      type="button"
    >
      {value}
      <Copy size={12} />
    </button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
}

function roleTone(role?: AdminRole) {
  if (role === "super_admin") {
    return {
      avatar: "bg-slate-900 text-white",
      badge: "bg-slate-900 text-white",
    };
  }
  if (role === "employee") {
    return {
      avatar: "bg-sky-100 text-sky-700",
      badge: "bg-sky-50 text-sky-700",
    };
  }
  return {
    avatar: "bg-emerald-100 text-forest",
    badge: "bg-emerald-50 text-forest",
  };
}
