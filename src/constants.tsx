import { Boxes, ClipboardList, LayoutDashboard, ShieldCheck, UserCog, Users, WalletCards } from "lucide-react";
import type { TransactionStatus } from "./types";

export const adminTabs = ["Overview", "Members", "Orders", "Finance", "Catalog", "Staff", "Account"] as const;
export type AdminTab = (typeof adminTabs)[number];

export const statusStyles: Record<TransactionStatus | "waiting" | "assigned" | "completed" | "frozen", string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  waiting: "bg-amber-100 text-amber-700",
  assigned: "bg-sky-100 text-sky-700",
  completed: "bg-emerald-100 text-emerald-700",
  frozen: "bg-rose-100 text-rose-700",
};

export function adminTabIcon(tab: AdminTab) {
  const props = { size: 18 };
  if (tab === "Overview") return <LayoutDashboard {...props} />;
  if (tab === "Members") return <Users {...props} />;
  if (tab === "Orders") return <ClipboardList {...props} />;
  if (tab === "Finance") return <WalletCards {...props} />;
  if (tab === "Catalog") return <Boxes {...props} />;
  if (tab === "Staff") return <UserCog {...props} />;
  return <ShieldCheck {...props} />;
}
