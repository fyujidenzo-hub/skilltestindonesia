import { auth, waitForAuthReady } from "../firebase";
import type { AdminRole, StaffAdmin } from "../types";

async function superAdminRequest(path: string, init: RequestInit = {}) {
  const user = auth?.currentUser ?? await waitForAuthReady();
  if (!user) throw new Error("Sesi Super Admin tidak aktif.");
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await user.getIdToken()}`,
      ...init.headers,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Tindakan Super Admin gagal.");
  return result;
}

export async function resetMemberAccountPassword(memberId: string, password: string) {
  await superAdminRequest(`/api/admin/members/${encodeURIComponent(memberId)}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export async function createStaffAccount(input: {
  name: string;
  username: string;
  password: string;
  adminCode: string;
  invitationCode: string;
  registrationBonus: number;
  role: Exclude<AdminRole, "super_admin">;
}): Promise<StaffAdmin> {
  const result = await superAdminRequest("/api/admin/staff", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result.staff as StaffAdmin;
}

export async function deleteStaffAccount(adminId: string): Promise<void> {
  await superAdminRequest(`/api/admin/staff/${encodeURIComponent(adminId)}`, {
    method: "DELETE",
  });
}
