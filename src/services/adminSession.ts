import type { AdminRole, StaffAdmin } from "../types";
import { clearCookieSession, getCookieSession, setCookieSession } from "./browserSession";

const activeAdminKey = "orderops-admin-session";

export function getActiveAdminId() {
  return getCookieSession(activeAdminKey);
}

export function setActiveAdminId(adminId: string) {
  setCookieSession(activeAdminKey, adminId);
}

export function clearActiveAdminId() {
  clearCookieSession(activeAdminKey);
}

export function getActiveAdmin(admins: StaffAdmin[]) {
  const activeId = getActiveAdminId();
  return admins.find((admin) => admin.id === activeId) ?? null;
}

export function roleLabel(role?: AdminRole) {
  if (role === "super_admin") return "Super admin";
  if (role === "admin") return "Admin";
  if (role === "employee") return "Employee";
  return "Staff";
}

export function allowedTabsForRole(role?: AdminRole) {
  if (role === "super_admin") {
    return ["Overview", "Members", "Tasks", "Orders", "Finance", "Catalog", "Staff", "Account"] as const;
  }

  if (role === "admin") {
    return ["Overview", "Members", "Tasks", "Orders", "Finance"] as const;
  }

  return ["Overview", "Members", "Tasks", "Orders"] as const;
}