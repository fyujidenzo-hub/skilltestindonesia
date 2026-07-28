export async function registerMemberAccount(input: {
  username: string;
  phone: string;
  invitationCode: string;
  accountPassword: string;
  withdrawalPin: string;
}): Promise<{ memberId: string }> {
  const response = await fetch("/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Akun tidak dapat dibuat.");
  return result;
}

export async function checkRegistrationIdentity(
  input: { username?: string; phone?: string },
  signal?: AbortSignal,
): Promise<{ usernameAvailable: boolean | null; phoneAvailable: boolean | null }> {
  const response = await fetch("/api/register/check-identity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Ketersediaan akun tidak dapat diperiksa.");
  return result;
}
