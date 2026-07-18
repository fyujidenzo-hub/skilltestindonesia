import { Panel } from "../common";
import type { Member } from "../../types";
import { formatRupiah } from "../../utils";
import Filters from "./Filters";
import { useEffect, useMemo, useState } from "react";
import { updateMember } from "../../services/membersService";
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
    setMessage("Saving...");

    try {
      const amount = Math.max(0, Number(form.amount) || 0);
      const isDirectBalanceCredit = modalType === "balance";
      const resetAccountPassword = modalType === "edit" && canManageMemberFinance ? form.accountPassword.trim() : "";
      const resetWithdrawalPassword = modalType === "edit" && canManageMemberFinance ? form.withdrawalPassword.trim() : "";
      const nextMember: Member =
        modalType === "edit"
          ? {
              ...activeMember,
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
          : { ...activeMember, balance: activeMember.balance + amount };

      await updateMember(activeMember.id, nextMember);
      dispatch({ type: "updateMember", payload: nextMember });

      if (isDirectBalanceCredit && amount > 0) {
        const rewardTransaction = await createRewardTransaction({
          member: activeMember.username,
          admin: "Super Admin",
          amount,
        });

        dispatch({ type: "addTransaction", payload: rewardTransaction });
      }

      setMessage(
        modalType === "edit"
          ? resetAccountPassword || resetWithdrawalPassword
            ? "Data anggota telah diperbarui dan kata sandi telah diatur ulang."
            : "Anggota telah diperbarui."
          : "Imbalan saldo telah ditambahkan dan dicatat."
      );
      setTimeout(closeModal, 600);
    } catch (error) {
      console.error("Failed to update member:", error);
      setMessage("Firebase update failed. Check Firestore member/transaction rules.");
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
                    <label className="text-xs font-bold text-amber-800">
                      Atur Ulang Kata Sandi Akun
                      <input
                        className="mt-1 w-full rounded border border-amber-200 bg-white px-3 py-2 text-slate-900"
                        value={form.accountPassword}
                        onChange={(event) => setForm({ ...form, accountPassword: event.target.value })}
                        type="password"
                        autoComplete="off"
                        placeholder="Enter new account password"
                      />
                    </label>
                    <label className="text-xs font-bold text-amber-800">
                      Atur Ulang Kata Sandi Penarikan
                      <input
                        className="mt-1 w-full rounded border border-amber-200 bg-white px-3 py-2 text-slate-900"
                        value={form.withdrawalPassword}
                        onChange={(event) => setForm({ ...form, withdrawalPassword: event.target.value })}
                        type="password"
                        autoComplete="off"
                        placeholder="Enter new withdrawal password / PIN"
                      />
                    </label>
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
                          Withdrawals On / Off
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                          Turn withdrawals on or off for this member account.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`shrink-0 rounded px-3 py-2 text-xs font-black text-white ${
                          form.withdrawalLocked ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                        onClick={() => setForm({ ...form, withdrawalLocked: !form.withdrawalLocked })}
                      >
                        {form.withdrawalLocked ? "Off" : "On"}
                      </button>
                    </div>
                    <label className="mt-3 block text-xs font-bold text-slate-600">
                      Remarks
                      <textarea
                        className="mt-1 min-h-20 w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-900"
                        value={form.withdrawalRemarks}
                        onChange={(event) => setForm({ ...form, withdrawalRemarks: event.target.value })}
                        placeholder="Reason shown when withdrawals are off"
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

            {message && <p className="mt-4 rounded bg-slate-50 p-3 text-sm font-bold text-slate-600">{message}</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="rounded border border-slate-200 px-3 py-2 font-bold" onClick={closeModal} disabled={saving}>
                Membatalkan
              </button>
              <button className="rounded bg-forest px-3 py-2 font-bold text-white disabled:bg-slate-400" disabled={saving}>
                {saving ? "Saving..." : "Submit"}
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
