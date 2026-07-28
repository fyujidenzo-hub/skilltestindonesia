import type { Member, Order, Transaction } from "../types";

type OwnedRecord = Pick<Order, "memberId" | "member"> | Pick<Transaction, "memberId" | "member">;
type MemberIdentity = Pick<Member, "id" | "username">;

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("id-ID");
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function belongsToMember(record: OwnedRecord, member: MemberIdentity) {
  return Boolean(record.memberId) && record.memberId === member.id;
}
