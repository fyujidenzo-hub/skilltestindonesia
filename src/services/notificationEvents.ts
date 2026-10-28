import type { Member, Order, StaffAdmin, Transaction } from "../types";
import { belongsToMember } from "./memberOwnership";

export type NotificationEvent = {
  id: string;
  title: string;
  body: string;
  time: string;
  path: string;
  tone: "info" | "success" | "warning" | "danger";
  adminTab?: "Members" | "Tasks" | "Orders" | "Finance";
};

function amount(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function sortTime(value: string) {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function recent(events: NotificationEvent[]) {
  return events.sort((a, b) => sortTime(b.time) - sortTime(a.time)).slice(0, 100);
}

function memberOrderEvents(order: Order): NotificationEvent[] {
  const reference = order.referenceNumber || order.id;
  const events: NotificationEvent[] = [{
    id: `order-${order.id}-created`, title: "Pesanan diterima",
    body: `Pesanan ${reference} sedang menunggu proses.`, time: order.createdAt,
    path: "/orders", tone: "info",
  }];
  if (order.assignedAt) events.push({
    id: `order-${order.id}-assigned`, title: "Produk telah ditetapkan",
    body: `${order.productName || "Produk"} · ${reference}`, time: order.assignedAt,
    path: "/orders", tone: "info",
  });
  if (["waiting_shipment", "belum_diserahkan", "diserahkan"].includes(order.status) && order.submittedAt) events.push({
    id: `order-${order.id}-submitted`, title: "Pesanan menunggu pengiriman",
    body: `Pesanan ${reference} telah dikirim untuk diproses.`, time: order.submittedAt,
    path: "/orders", tone: "info",
  });
  if (order.status === "frozen") events.push({
    id: `order-${order.id}-frozen`, title: "Pesanan ditangguhkan",
    body: `Pesanan ${reference} memerlukan perhatian.`, time: order.adminChangedAt || order.createdAt,
    path: "/orders", tone: "danger",
  });
  if (order.status === "rejected") events.push({
    id: `order-${order.id}-rejected`, title: "Permintaan produk ditolak",
    body: `${order.productName || "Produk yang dipilih"} · ${reference}`, time: order.adminChangedAt || order.createdAt,
    path: "/orders", tone: "danger",
  });
  if (["completed", "diserahkan"].includes(order.status)) events.push({
    id: `order-${order.id}-completed`, title: "Pesanan selesai",
    body: `${reference} · Komisi ${amount(order.commission)}`, time: order.completedAt || order.submittedAt || order.createdAt,
    path: "/orders", tone: "success",
  });
  return events;
}

function memberTransactionEvents(transaction: Transaction): NotificationEvent[] {
  const kind = transaction.type === "topup" ? "Isi saldo" : transaction.type === "withdrawal" ? "Penarikan" : "Bonus";
  const path = transaction.type === "withdrawal" ? "/withdraw" : "/topup";
  const events: NotificationEvent[] = [{
    id: `transaction-${transaction.id}-created`, title: `${kind} diajukan`,
    body: `${amount(transaction.amount)} · ${transaction.requestId || transaction.id}`, time: transaction.createdAt,
    path, tone: "warning",
  }];
  if (transaction.status !== "pending") events.push({
    id: `transaction-${transaction.id}-${transaction.status}`,
    title: `${kind} ${transaction.status === "approved" ? "disetujui" : "ditolak"}`,
    body: `${amount(transaction.amount)} · ${transaction.requestId || transaction.id}`,
    time: transaction.creditedAt || transaction.createdAt, path,
    tone: transaction.status === "approved" ? "success" : "danger",
  });
  return events;
}

export function customerNotificationEvents(member: Member, orders: Order[], transactions: Transaction[]) {
  return recent([
    ...orders.filter((order) => belongsToMember(order, member)).flatMap(memberOrderEvents),
    ...transactions.filter((transaction) => belongsToMember(transaction, member)).flatMap(memberTransactionEvents),
  ]);
}

function belongsToAdmin(member: Member, admin: StaffAdmin) {
  return member.referredByAdminId ? member.referredByAdminId === admin.id : member.referredBy === admin.name;
}

export function adminNotificationEvents(admin: StaffAdmin, members: Member[], orders: Order[], transactions: Transaction[]) {
  const scopedMembers = admin.role === "super_admin" ? members : members.filter((member) => belongsToAdmin(member, admin));
  const memberIds = new Set(scopedMembers.map((member) => member.id));
  const memberNames = new Set(scopedMembers.map((member) => member.username));
  const own = (memberId: string | undefined, username: string) => {
    if (admin.role === "super_admin") return true;
    if (memberId) return memberIds.has(memberId);
    return memberNames.has(username);
  };
  const events: NotificationEvent[] = scopedMembers.map((member) => ({
    id: `member-${member.id}-registered`, title: "Pendaftaran baru",
    body: `${member.username} mendaftar melalui ${member.referredBy || "admin"}.`, time: member.lastLogin,
    path: "/admin", tone: "success", adminTab: "Members",
  }));
  for (const transaction of transactions.filter((item) => own(item.memberId, item.member))) {
    if (transaction.type === "reward") continue;
    events.push({
      id: `transaction-${transaction.id}-created`,
      title: transaction.type === "topup" ? "Permintaan isi saldo baru" : "Permintaan penarikan baru",
      body: `${transaction.member} · ${amount(transaction.amount)}`, time: transaction.createdAt,
      path: "/admin", tone: "warning", adminTab: "Finance",
    });
  }
  for (const order of orders.filter((item) => own(item.memberId, item.member))) {
    events.push({
      id: `order-${order.id}-created`, title: "Pesanan baru",
      body: `${order.member} · ${order.referenceNumber || order.id}`, time: order.createdAt,
      path: "/admin", tone: "info", adminTab: "Tasks",
    });
    if (["completed", "diserahkan"].includes(order.status)) events.push({
      id: `order-${order.id}-completed`, title: "Pesanan selesai",
      body: `${order.member} · ${order.referenceNumber || order.id}`, time: order.completedAt || order.submittedAt || order.createdAt,
      path: "/admin", tone: "success", adminTab: "Orders",
    });
  }
  return recent(events);
}
