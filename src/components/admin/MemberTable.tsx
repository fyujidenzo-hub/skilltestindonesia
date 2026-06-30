import { Panel } from "../common";
import type { Member } from "../../types";
import { formatRupiah } from "../../utils";
import Filters from "./Filters";
import { useState } from "react";
import { updateMember } from "../../services/membersService";
import { useAppStore } from "../../store/AppStore";

export default function MemberTable({ members }: { members: Member[] }) {
  const { dispatch } = useAppStore();
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [modalType, setModalType] = useState<"edit" | "balance" | "rewards" | null>(null);
  const [form, setForm] = useState({ username: "", phone: "", level: "Starter", amount: 0 });
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const openModal = (member: Member, type: "edit" | "balance" | "rewards") => {
    setActiveMember(member);
    setModalType(type);
    setForm({ username: member.username, phone: member.phone, level: member.level, amount: 0 });
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
      const nextMember: Member =
        modalType === "edit"
          ? { ...activeMember, username: form.username.trim(), phone: form.phone.trim(), level: form.level as Member["level"] }
          : { ...activeMember, balance: activeMember.balance + amount };

      await updateMember(activeMember.id, nextMember);
      dispatch({ type: "updateMember", payload: nextMember });
      setMessage(modalType === "edit" ? "Member updated." : "Balance updated.");
      setTimeout(closeModal, 600);
    } catch (error) {
      console.error("Failed to update member:", error);
      setMessage("Firebase update failed. Check Firestore member rules.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Member Management">
      <Filters />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="border border-slate-200 p-3">Promotion code</th>
              <th className="border border-slate-200 p-3">Username</th>
              <th className="border border-slate-200 p-3">Balance</th>
              <th className="border border-slate-200 p-3">Orders</th>
              <th className="border border-slate-200 p-3">Last login</th>
              <th className="border border-slate-200 p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td className="border border-slate-200 p-3 font-semibold">{member.invitationCode}</td>
                <td className="border border-slate-200 p-3">
                  <p className="font-bold">{member.username}</p>
                  <p className="text-coral">{member.phone}</p>
                  <p className="text-xs text-slate-500">ID: {member.id} · {member.referredBy}</p>
                  <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">{member.level}</span>
                </td>
                <td className="border border-slate-200 p-3 font-bold text-coral">{formatRupiah(member.balance)}</td>
                <td className="border border-slate-200 p-3">{member.totalOrders}</td>
                <td className="border border-slate-200 p-3">{member.lastLogin}</td>
                <td className="border border-slate-200 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="rounded bg-sky-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => openModal(member, "edit")}>
                      Edit
                    </button>
                    <button className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => openModal(member, "balance")}>
                      Add Balance
                    </button>
                    <button className="rounded bg-rose-600 px-3 py-1.5 text-xs font-bold text-white" onClick={() => openModal(member, "rewards")}>
                      Rewards
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeMember && modalType && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
          <form className="w-full max-w-sm rounded bg-white p-6 shadow-panel" onSubmit={saveMemberChange}>
            <h3 className="text-xl font-black">
              {modalType === "edit" ? "Edit Member" : modalType === "balance" ? "Add Balance" : "Rewards"}
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
              </div>
            ) : (
              <label className="mt-5 block text-xs font-bold text-slate-600">
                {modalType === "balance" ? "Balance amount" : "Reward amount"}
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
