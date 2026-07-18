import { Panel } from "../common";
import type { Member } from "../../types";
import { formatRupiah } from "../../utils";
import Filters from "./Filters";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { getMemberById, updateMember } from "../../services/membersService";
import { createRewardTransaction } from "../../services/transactionsService";
import { useAppStore } from "../../store/AppStore";

const pageSize = 10;
const taskTarget = 15;

    export default function MemberTable({
      members,
      canManageMemberFinance = false,
      canManageWithdrawalLock = false,
    }: {
      members: Member[];
      canManageMemberFinance?: boolean;
      canManageWithdrawalLock?: boolean;
    }) {
  const { dispatch } = useAppStore();
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [modalType, setModalType] = useState<"edit" | "balance" | null>(null);
  const [form, setForm] = useState({
    username: "",
    phone: "",
    level: "Starter",
    amount: 0,
    accountPassword: "",
    withdrawalPassword: "",
    withdrawalLocked: false,
    withdrawalRemarks: "",
  });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAccountPassword, setShowAccountPassword] = useState(false);
  const [showWithdrawalPassword, setShowWithdrawalPassword] = useState(false);
  const [page, setPage] = useState(0);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((left, right) => {
        const rightDate = new Date(right.lastLogin.replace(" ", "T")).getTime();
        const leftDate = new Date(left.lastLogin.replace(" ", "T")).getTime();
        return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
      }),
    [members],
  );
  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / pageSize));
  const visibleMembers = sortedMembers.slice(page * pageSize, page * pageSize + pageSize);
  const totalBalance = sortedMembers.reduce((sum, member) => sum + member.balance, 0);
  const totalOrders = sortedMembers.reduce((sum, member) => sum + member.totalOrders, 0);
  const startRow = sortedMembers.length ? page * pageSize + 1 : 0;
  const endRow = Math.min(sortedMembers.length, (page + 1) * pageSize);

  useEffect(() => {
    setPage(0);
  }, [members.length]);

const openModal = (member: Member, type: "edit" | "balance") => {
  if (type === "balance" && !canManageMemberFinance) return;

  setActiveMember(member);
  setModalType(type);
  setForm({
    username: member.username,
    phone: member.phone,
    level: member.level,
    amount: 0,
    accountPassword: "",
    withdrawalPassword: "",
    withdrawalLocked: Boolean(member.withdrawalLocked),
    withdrawalRemarks: member.withdrawalRemarks ?? "",
  });
  setMessage("");
  setShowAccountPassword(false);
  setShowWithdrawalPassword(false);
};

  const closeModal = () => {
    setActiveMember(null);
    setModalType(null);
    setMessage("");
  };

  const saveMemberChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeMember || !modalType) return;

    setSaving(true);
    setMessage("Menyimpan...");

    try {
      const amount = Math.max(0, Number(form.amount) || 0);
      const isDirectBalanceCredit = modalType === "balance";
      const resetAccountPassword = modalType === "edit" && canManageMemberFinance ? form.accountPassword.trim() : "";
      const resetWithdrawalPassword = modalType === "edit" && canManageMemberFinance ? form.withdrawalPassword.trim() : "";
      const memberChanges: Partial<Member> =
        modalType === "edit"
          ? {
              username: form.username.trim(),
              phone: form.phone.trim(),
              level: form.level as Member["level"],
              ...(resetAccountPassword ? { accountPassword: resetAccountPassword } : {}),
              ...(resetWithdrawalPassword ? { withdrawalPassword: resetWithdrawalPassword } : {}),
              ...(canManageWithdrawalLock
                ? {
                    withdrawalLocked: form.withdrawalLocked,
                    withdrawalRemarks: form.withdrawalRemarks.trim(),
                  }
                : {}),
            }
          : { balance: activeMember.balance + amount };

      await updateMember(activeMember.id, memberChanges);
      const savedMember = await getMemberById(activeMember.id);
      if (!savedMember) throw new Error("Data anggota tidak dapat dimuat ulang setelah disimpan.");

      if (resetAccountPassword && savedMember.accountPassword !== resetAccountPassword) {
        throw new Error("Kata sandi akun tidak berhasil disimpan.");
      }
      if (resetWithdrawalPassword && savedMember.withdrawalPassword !== resetWithdrawalPassword) {
        throw new Error("PIN penarikan tidak berhasil disimpan.");
      }
      if (canManageWithdrawalLock && Boolean(savedMember.withdrawalLocked) !== form.withdrawalLocked) {
        throw new Error("Pengaturan penarikan tidak berhasil disimpan.");
      }

      dispatch({ type: "updateMember", payload: savedMember });
      setActiveMember(savedMember);

      if (isDirectBalanceCredit && amount > 0) {
        const rewardTransaction = await createRewardTransaction({
          member: activeMember.username,
          admin: "Super Admin",
          amount,
        });

        dispatch({ type: "addTransaction", payload: rewardTransaction });
      }

      const savedItems = [
        resetAccountPassword ? "kata sandi akun diatur ulang" : "",
        resetWithdrawalPassword ? "PIN penarikan diatur ulang" : "",
        canManageWithdrawalLock ? `penarikan ${form.withdrawalLocked ? "dinonaktifkan" : "diaktifkan"}` : "",
      ].filter(Boolean);
      setMessage(
        modalType === "edit"
          ? `Berhasil disimpan${savedItems.length ? `: ${savedItems.join(", ")}.` : "."}`
          : "Saldo berhasil ditambahkan."
      );
      setForm((current) => ({ ...current, accountPassword: "", withdrawalPassword: "" }));
    } catch (error) {
      console.error("Failed to update member:", error);
      setMessage(error instanceof Error ? `Gagal menyimpan: ${error.message}` : "Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Member Management">
      <Filters />

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MemberSummary label="Total members" value={String(sortedMembers.length)} />
        <MemberSummary label="Total balance" value={formatRupiah(totalBalance)} />
        <MemberSummary label="Total orders" value={String(totalOrders)} />
      </div>

      <div className="mt-4 rounded border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-black text-slate-900">Catatan akun kerja</p>
            <p className="text-xs text-slate-500">
              Menampilkan {startRow}-{endRow} of {sortedMembers.length} anggota
            </p>
          </div>
          <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">10 per halaman</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-[13px]">
            <thead className="bg-slate-900 text-xs uppercase text-white">
              <tr>
                <MemberTh>Kode Promosi</MemberTh>
                <MemberTh>Pengguna</MemberTh>
                <MemberTh>Nama / Akun</MemberTh>
                <MemberTh>Keseimbangan</MemberTh>
                <MemberTh>Pesanan</MemberTh>
                <MemberTh>Tingkat</MemberTh>
                <MemberTh>Login Terakhir</MemberTh>
                <MemberTh>Tindakan</MemberTh>
              </tr>
            </thead>
            <tbody>
              {visibleMembers.length ? (
                visibleMembers.map((member) => (
                  <tr key={member.id} className="group align-middle transition hover:bg-slate-50">
                    <MemberTd>
                      <span className="rounded bg-emerald-50 px-2.5 py-1 text-sm font-black text-forest">{member.invitationCode}</span>
                    </MemberTd>
                    <MemberTd>
                      <p className="font-black text-slate-900">{member.phone}</p>
                      <p className="text-xs text-slate-500">ID: {member.id}</p>
                      <p className="text-xs text-slate-500">{member.referredBy}</p>
                    </MemberTd>
                    <MemberTd>
                      <p className="font-black text-slate-900">{member.username}</p>
                      <p className="text-xs font-semibold text-slate-500">Invitation: {member.invitationCode}</p>
                    </MemberTd>
                    <MemberTd>
                      <span className="whitespace-nowrap text-base font-black text-coral">{formatRupiah(member.balance)}</span>
                    </MemberTd>
                    <MemberTd>
                      <span className="rounded bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-700">
                        {Math.min(member.totalOrders, taskTarget)} / {taskTarget}
                      </span>
                    </MemberTd>
                    <MemberTd>
                      <span className="inline-block rounded bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">{member.level}</span>
                      {member.withdrawalLocked && (
                        <span className="mt-1 block w-fit rounded bg-rose-100 px-2 py-1 text-xs font-black text-rose-700">
                          Withdrawals Off
                        </span>
                      )}
                    </MemberTd>
                    <MemberTd>
                      <span className="text-sm font-semibold text-slate-700">{member.lastLogin}</span>
                    </MemberTd>
                    <MemberTd>
                      <MemberActions
                        member={member}
                        onOpen={openModal}
                        canManageMemberFinance={canManageMemberFinance}
                      />
                    </MemberTd>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-slate-500">
                    Tidak ada anggota yang ditemukan dalam cakupan admin ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {activeMember && modalType && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <form className="w-full max-w-sm rounded bg-white p-6 shadow-panel" onSubmit={saveMemberChange}>
            <h3 className="text-xl font-black">
              {modalType === "edit" ? "Edit Member" : "Add Balance"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{activeMember.username}</p>

            {modalType === "edit" ? (
              <div className="mt-5 grid gap-3">
                <label className="text-xs font-bold text-slate-600">
                  Nama belakang
                  <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Telepon
                  <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Tingkat
                  <select className="mt-1 w-full rounded border border-slate-200 px-3 py-2" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                    <option>Starter</option>
                    <option>Silver</option>
                    <option>Gold</option>
                    <option>VIP</option>
                  </select>
                </label>

                {canManageMemberFinance && (
                  <div className="grid gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <div className="text-xs font-bold text-amber-800">
                      <span>Atur Ulang Kata Sandi Akun</span>
                      <div className="relative mt-1">
                        <input
                        className="w-full rounded border border-amber-200 bg-white py-2 pl-3 pr-11 text-slate-900"
                        value={form.accountPassword}
                        onChange={(event) => setForm({ ...form, accountPassword: event.target.value })}
                        type={showAccountPassword ? "text" : "password"}
                        autoComplete="off"
                        placeholder="Enter new account password"
                      />
                        <PasswordVisibilityButton visible={showAccountPassword} onToggle={() => setShowAccountPassword((visible) => !visible)} />
                      </div>
                    </div>
                    <div className="text-xs font-bold text-amber-800">
                      <span>Atur Ulang Kata Sandi Penarikan</span>
                      <div className="relative mt-1">
                        <input
                        className="w-full rounded border border-amber-200 bg-white py-2 pl-3 pr-11 text-slate-900"
                        value={form.withdrawalPassword}
                        onChange={(event) => setForm({ ...form, withdrawalPassword: event.target.value })}
                        type={showWithdrawalPassword ? "text" : "password"}
                        autoComplete="off"
                        placeholder="Enter new withdrawal password / PIN"
                      />
                        <PasswordVisibilityButton visible={showWithdrawalPassword} onToggle={() => setShowWithdrawalPassword((visible) => !visible)} />
                      </div>
                    </div>
                    <p className="text-xs font-semibold leading-5 text-amber-700">
                     Biarkan kosong jika Anda tidak ingin mengubah kata sandi anggota.
                    </p>
                  </div>
                )}

                {canManageWithdrawalLock && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-600">
                          Pengaturan Penarikan
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          Aktifkan atau nonaktifkan penarikan untuk akun anggota ini.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`shrink-0 rounded px-3 py-2 text-xs font-black text-white ${
                          form.withdrawalLocked ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                        onClick={() => setForm({ ...form, withdrawalLocked: !form.withdrawalLocked })}
                      >
                        {form.withdrawalLocked ? "Nonaktif" : "Aktif"}
                      </button>
                    </div>
                    <label className="mt-3 block text-xs font-bold text-slate-600">
                      Keterangan
                      <textarea
                        className="mt-1 min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-900"
                        value={form.withdrawalRemarks}
                        onChange={(event) => setForm({ ...form, withdrawalRemarks: event.target.value })}
                        placeholder="Alasan yang ditampilkan saat penarikan dinonaktifkan"
                      />
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <label className="mt-5 block text-xs font-bold text-slate-600">
Jumlah saldo
                <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2" type="number" min={0} value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) || 0 })} placeholder="Rp 0" required />
              </label>
            )}

            {message && (
              <p
                className={`mt-4 rounded p-3 text-sm font-bold ${
                  message.startsWith("Berhasil") || message.includes("berhasil")
                    ? "bg-emerald-50 text-emerald-700"
                    : message.startsWith("Gagal menyimpan")
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-50 text-slate-600"
                }`}
              >
                {message}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="rounded border border-slate-200 px-3 py-2 font-bold" onClick={closeModal} disabled={saving}>
                Batal
              </button>
              <button className="rounded bg-forest px-3 py-2 font-bold text-white disabled:bg-slate-400" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </Panel>
  );
}

function MemberSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function MemberActions({
  member,
  onOpen,
  canManageMemberFinance,
}: {
  member: Member;
  onOpen: (member: Member, type: "edit" | "balance") => void;
  canManageMemberFinance: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        className="rounded bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
        onClick={() => onOpen(member, "edit")}
      >
        Sunting
      </button>

      {canManageMemberFinance && (
        <button
          className="rounded bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
          onClick={() => onOpen(member, "balance")}
        >
          Tambah Saldo
        </button>
      )}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-slate-500">
        Page {page + 1} of {totalPages}
      </p>
      <div className="flex gap-2">
        <button className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 disabled:text-slate-300 sm:flex-none" disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
          Sebelumnya
        </button>
        <button className="flex-1 rounded bg-forest px-3 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:flex-none" disabled={page >= totalPages - 1} onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function MemberTh({ children }: { children: React.ReactNode }) {
  return <th className="border-r border-slate-700 px-4 py-3 font-black last:border-r-0">{children}</th>;
}

function MemberTd({ children }: { children: React.ReactNode }) {
  return <td className="border-b border-slate-200 border-r border-slate-100 px-3 py-3 align-middle last:border-r-0">{children}</td>;
}

function PasswordVisibilityButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const label = visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi";

  return (
    <button
      type="button"
      className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-slate-500 transition hover:bg-emerald-50 hover:text-forest focus:outline-none focus:ring-2 focus:ring-emerald-200"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      {visible ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}
