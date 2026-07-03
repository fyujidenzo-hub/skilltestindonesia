import { Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveCustomerId } from "../services/customerSession";
import { useAppStore } from "../store/AppStore";

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

async function verifyInvitationCode(code: string): Promise<{
  verified: boolean;
  adminName: string;
  registrationBonus: number;
}> {
  try {
    const { getAdminByCode } = await import("../services/adminsService");
    const admin = await getAdminByCode(code);

    return {
      verified: !!admin,
      adminName: admin?.name || "",
      registrationBonus: admin?.registrationBonus ?? 0,
    };
  } catch (error) {
    console.error("Error verifying code:", error);
    return { verified: false, adminName: "", registrationBonus: 0 };
  }
}

export default function RegisterPage({ navigate }: { navigate: Navigate }) {
  const { dispatch } = useAppStore();
  const code = new URLSearchParams(window.location.search).get("code") ?? "";

  const [form, setForm] = useState({
    username: "",
    phone: "",
    invitationCode: code,
    accountPassword: "",
    withdrawalPassword: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedAdmin, setVerifiedAdmin] = useState("");
  const [registrationBonus, setRegistrationBonus] = useState(0);

  const fieldStyle = `${inputClass} h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus:border-forest focus:bg-white focus:ring-2 focus:ring-emerald-100`;

  const messageStyle = `rounded-xl p-3 text-sm font-semibold ${
    message.includes("✗")
      ? "bg-red-50 text-red-700"
      : "bg-emerald-50 text-emerald-700"
  }`;

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setMessage("Verifying code...");

    const result = await verifyInvitationCode(form.invitationCode);

    setLoading(false);

    if (result.verified) {
      setVerified(true);
      setVerifiedAdmin(result.adminName);
      setRegistrationBonus(result.registrationBonus);
      setMessage("");
    } else {
      setMessage("✗ Invalid invitation code");
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.username.trim()) {
      setMessage("✗ Username is required");
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

    const memberId = String(Date.now()).slice(-6);

    const memberToSave = {
      id: memberId,
      username: form.username,
      phone: form.phone,
      invitationCode: form.invitationCode,
      referredBy: verifiedAdmin,
      level: "Starter" as const,
      balance: registrationBonus,
      totalOrders: 0,
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      accountPassword: form.accountPassword,
      withdrawalPassword: form.withdrawalPassword,
    };

    const saved = await saveToFirebase(memberToSave);

    setLoading(false);

    if (saved) {
      dispatch({
        type: "registerMember",
        payload: {
          id: memberId,
          username: form.username,
          phone: form.phone,
          invitationCode: form.invitationCode,
          accountPassword: form.accountPassword,
          withdrawalPassword: form.withdrawalPassword,
        },
      });

      setActiveCustomerId(memberId);
      setMessage("✓ Account created! Redirecting...");
      setTimeout(() => navigate("/"), 1500);
    } else {
      setMessage("✗ Failed to save. Please try again.");
    }
  };

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-4 py-10 text-ink"
      style={{
        backgroundImage: "url('/assets/login-page-bg4.jpeg')",
      }}
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-transparent to-green-900/50" />

      <section className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-100 bg-white/90 p-8 shadow-2xl backdrop-blur-xl">
        <button
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-forest transition hover:bg-emerald-100"
          onClick={() => navigate("/")}
        >
          <Store size={18} />
          Back to store
        </button>

        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Create Work Account
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Complete your account details. Your account will be linked to the
          verified admin team.
        </p>
<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
  Note: You need an invitation code from your referrer to create an account.
  If you don’t have a code yet, please contact your referrer or admin for assistance.
</div>
        {!verified ? (
          <form className="mt-7 grid gap-4" onSubmit={handleVerifyCode}>
            <Field label="Invitation code">
              <input
                className={fieldStyle}
                required
                placeholder="Enter your invitation code"
                value={form.invitationCode}
                onChange={(event) =>
                  setForm({ ...form, invitationCode: event.target.value })
                }
              />
            </Field>

            {message && <p className={messageStyle}>{message}</p>}

            <button
              disabled={loading}
              className="h-12 w-full rounded-xl bg-forest font-bold text-white shadow-md transition hover:bg-forest/90 disabled:bg-slate-400"
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>
          </form>
        ) : (
          <form className="mt-7 grid gap-4" onSubmit={handleRegister}>
            {verifiedAdmin && (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                ✓ Invitation verified: {verifiedAdmin}
              </div>
            )}

            <Field label="Username">
              <input
                className={fieldStyle}
                required
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
            </Field>

            <Field label="Phone number">
              <input
                className={fieldStyle}
                required
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
            </Field>

            <Field label="Invitation code">
              <input
                className={`${fieldStyle} cursor-not-allowed opacity-70`}
                disabled
                value={form.invitationCode}
              />
            </Field>

            <Field label="Password">
              <input
                className={fieldStyle}
                required
                type="password"
                value={form.accountPassword}
                onChange={(event) =>
                  setForm({ ...form, accountPassword: event.target.value })
                }
              />
            </Field>

            <Field label="Withdrawal password">
              <input
                className={fieldStyle}
                required
                type="password"
                value={form.withdrawalPassword}
                onChange={(event) =>
                  setForm({ ...form, withdrawalPassword: event.target.value })
                }
              />

              
            </Field>

            {message && <p className={messageStyle}>{message}</p>}

            <button
              disabled={loading}
              className="h-12 w-full rounded-xl bg-forest font-bold text-white shadow-md transition hover:bg-forest/90 disabled:bg-slate-400"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerified(false);
                setMessage("");
              }}
              className="h-12 w-full rounded-xl border-2 border-forest font-bold text-forest transition hover:bg-forest/10"
            >
              Change invitation code
            </button>
          </form>
        )}
      </section>
    </main>
  );
}