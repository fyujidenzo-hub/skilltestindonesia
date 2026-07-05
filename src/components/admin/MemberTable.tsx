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
    }: {
      members: Member[];
      canManageMemberFinance?: boolean;
    }) {
  const { dispatch } = useAppStore();
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [modalType, setModalType] = useState<"edit" | "balance" | null>(null);
  const [form, setForm] = useState({ username: "", phone: "", level: "Starter", amount: 0, withdrawalPassword: "" });
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
  setForm({ username: member.username, phone: member.phone, level: member.level, amount: 0, withdrawalPassword: "" });
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
      const resetWithdrawalPassword = modalType === "edit" && canManageMemberFinance ? form.withdrawalPassword.trim() : "";
      const nextMember: Member =
        modalType === "edit"
          ? {
              ...activeMember,
              username: form.username.trim(),
              phone: form.phone.trim(),
              level: form.level as Member["level"],
              ...(resetWithdrawalPassword ? { withdrawalPassword: resetWithdrawalPassword } : {}),
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
          ? resetWithdrawalPassword
            ? "Member updated and withdrawal password reset."
            : "Member updated."
          : "Balance reward added and recorded."
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
            <p className="text-sm font-black text-slate-900">Customer account records</p>
            <p className="text-xs text-slate-500">
              Showing {startRow}-{endRow} of {sortedMembers.length} members
            </p>
          </div>
          <span className="rounded bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">10 per page</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-[13px]">
            <thead className="bg-slate-900 text-xs uppercase text-white">
              <tr>
                <MemberTh>Promotion Code</MemberTh>
                <MemberTh>User</MemberTh>
                <MemberTh>Name / Account</MemberTh>
                <MemberTh>Balance</MemberTh>
                <MemberTh>Orders</MemberTh>
                <MemberTh>Level</MemberTh>
                <MemberTh>Last Login</MemberTh>
                <MemberTh>Action</MemberTh>
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
                    No members found in this admin scope.
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
                  Username
                  <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Phone
                  <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Level
                  <select className="mt-1 w-full rounded border border-slate-200 px-3 py-2" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                    <option>Starter</option>
                    <option>Silver</option>
                    <option>Gold</option>
                    <option>VIP</option>
                  </select>
                </label>

                {canManageMemberFinance && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <label className="text-xs font-bold text-amber-800">
                      Reset Withdrawal Password
                      <input
                        className="mt-1 w-full rounded border border-amber-200 bg-white px-3 py-2 text-slate-900"
                        value={form.withdrawalPassword}
                        onChange={(event) => setForm({ ...form, withdrawalPassword: event.target.value })}
                        type="password"
                        autoComplete="off"
                        placeholder="Enter new withdrawal password / PIN"
                      />
                    </label>
                    <p className="mt-2 text-xs font-semibold leading-5 text-amber-700">
                      Leave this blank if you do not want to change the member's withdrawal password.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <label className="mt-5 block text-xs font-bold text-slate-600">
Balance amount
                <input className="mt-1 w-full rounded border border-slate-200 px-3 py-2" type="number" min={0} value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) || 0 })} placeholder="Rp 0" required />
              </label>
            )}

            {message && <p className="mt-4 rounded bg-slate-50 p-3 text-sm font-bold text-slate-600">{message}</p>}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="rounded border border-slate-200 px-3 py-2 font-bold" onClick={closeModal} disabled={saving}>
                Cancel
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
        Edit
      </button>

      {canManageMemberFinance && (
        <button
          className="rounded bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
          onClick={() => onOpen(member, "balance")}
        >
          Add Balance
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
          Previous
        </button>
        <button className="flex-1 rounded bg-forest px-3 py-2 text-sm font-black text-white disabled:bg-slate-300 sm:flex-none" disabled={page >= totalPages - 1} onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}>
          Next
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