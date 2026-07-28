export type IdentityKeyType = "username" | "phone" | "memberUsername" | "memberPhone" | "adminUsername";

export async function identityKey(type: IdentityKeyType, value: string) {
  const bytes = new TextEncoder().encode(`${type}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
