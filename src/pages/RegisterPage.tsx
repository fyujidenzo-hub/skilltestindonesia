import { Store } from "lucide-react";
import { useState } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { useAppStore } from "../store/AppStore";

const API_URL = "http://localhost:3001";

async function saveToFirebase(memberData: any): Promise<boolean> {
  try {
    const { createMember } = await import("../services/membersService");
    await createMember(memberData);
    console.log("✓ Member saved to Firebase:", memberData.username);
    return true;
  } catch (error) {
    console.error("❌ Failed to save to Firebase:", error);
    return false;
  }
}

async function verifyInvitationCode(code: string): Promise<{ verified: boolean; adminName: string }> {
  try {
    const { getAdminByCode } = await import("../services/adminsService");
    const admin = await getAdminByCode(code);
    return {
      verified: !!admin,
      adminName: admin?.name || "",
    };
  } catch (error) {
    console.error("Error verifying code:", error);
    return { verified: false, adminName: "" };
  }
}

export default function RegisterPage({ navigate }: { navigate: Navigate }) {
  const { dispatch } = useAppStore();
  const code = new URLSearchParams(window.location.search).get("code") ?? "";
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    invitationCode: code,
    accountPassword: "",
    withdrawalPassword: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedAdmin, setVerifiedAdmin] = useState("");

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("Verifying code...");

    const result = await verifyInvitationCode(form.invitationCode);
    setLoading(false);

    if (result.verified) {
      setVerified(true);
      setVerifiedAdmin(result.adminName);
      setMessage("");
    } else {
      setMessage("✗ Invalid invitation code");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.username.trim()) {
      setMessage("✗ Username is required");
      return;
    }
    if (!form.email.trim()) {
      setMessage("✗ Email is required");
      return;
    }
    if (!form.phone.trim()) {
      setMessage("✗ Phone number is required");
      return;
    }
    if (!form.accountPassword.trim()) {
      setMessage("✗ Password is required");
      return;
    }
    if (!form.withdrawalPassword.trim()) {
      setMessage("✗ Withdrawal password is required");
      return;
    }

    setLoading(true);
    setMessage("Creating account...");

    // Create member object
    const memberToSave = {
      id: String(Date.now()).slice(-6),
      username: form.username,
      email: form.email,
      phone: form.phone,
      invitationCode: form.invitationCode,
      referredBy: verifiedAdmin,
      level: "Starter" as const,
      balance: 0,
      totalOrders: 0,
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      accountPassword: form.accountPassword,
      withdrawalPassword: form.withdrawalPassword,
    };

    // Save to Firebase
    const saved = await saveToFirebase(memberToSave);

    // Dispatch to local state
    dispatch({
      type: "registerMember",
      payload: {
        username: form.username,
        email: form.email,
        phone: form.phone,
        invitationCode: form.invitationCode,
        accountPassword: form.accountPassword,
        withdrawalPassword: form.withdrawalPassword,
      },
    });

    setLoading(false);

    if (saved) {
      setMessage("✓ Account created! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } else {
      setMessage("✗ Failed to save. Please try again.");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-mint px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded bg-white p-6 shadow-panel">
        <button className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest" onClick={() => navigate("/")}>
          <Store size={18} />
          Back to store
        </button>
        <h1 className="text-3xl font-black">Create customer account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Complete your account details. Your account will be linked to the verified admin team.</p>

        {!verified ? (
          <form className="mt-6 grid gap-3" onSubmit={handleVerifyCode}>
            <Field label="Invitation code">
              <input
                className={inputClass}
                required
                placeholder="Enter your invitation code"
                value={form.invitationCode}
                onChange={(event) => setForm({ ...form, invitationCode: event.target.value })}
              />
            </Field>
            {message && (
              <p
                className={`rounded p-3 text-sm font-semibold ${
                  message.includes("✗") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </p>
            )}
            <button disabled={loading} className="h-12 w-full rounded bg-forest font-bold text-white hover:bg-forest/90 disabled:bg-slate-400">
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        ) : (
          <form className="mt-6 grid gap-3" onSubmit={handleRegister}>
            {verifiedAdmin && (
              <div className="rounded bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">✓ Invitation verified: {verifiedAdmin}</div>
            )}

            <Field label="Username">
              <input
                className={inputClass}
                required
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                className={inputClass}
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </Field>
            <Field label="Phone number">
              <input
                className={inputClass}
                required
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
              />
            </Field>
            <Field label="Invitation code">
              <input className={inputClass} disabled value={form.invitationCode} />
            </Field>
            <Field label="Password">
              <input
                className={inputClass}
                required
                type="password"
                value={form.accountPassword}
                onChange={(event) => setForm({ ...form, accountPassword: event.target.value })}
              />
            </Field>
            <Field label="Withdrawal password">
              <input
                className={inputClass}
                required
                type="password"
                value={form.withdrawalPassword}
                onChange={(event) => setForm({ ...form, withdrawalPassword: event.target.value })}
              />
            </Field>

            {message && (
              <p
                className={`rounded p-3 text-sm font-semibold ${
                  message.includes("✗") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {message}
              </p>
            )}

            <button disabled={loading} className="h-12 w-full rounded bg-forest font-bold text-white hover:bg-forest/90 disabled:bg-slate-400">
              {loading ? "Creating..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerified(false);
                setMessage("");
              }}
              className="h-10 w-full rounded border-2 border-forest font-bold text-forest hover:bg-forest/10"
            >
              Change invitation code
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
