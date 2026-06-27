import { Store } from "lucide-react";
import { useState } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveCustomerId } from "../services/customerSession";
import { useAppStore } from "../store/AppStore";
import type { StaffAdmin } from "../types";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isOTPExpired(timestamp: number): boolean {
  const now = Date.now();
  const expiryTime = 5 * 60 * 1000; // 5 minutes
  return now - timestamp > expiryTime;
}

const API_URL = "http://localhost:3001";

async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: email,
        subject: "Your OTP for Account Registration",
        html: `
          <h2>Verify Your Email</h2>
          <p>Your OTP code is:</p>
          <h1 style="color: #2d5016; font-size: 32px; letter-spacing: 2px;">${otp}</h1>
          <p><strong>This code will expire in 5 minutes.</strong></p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Email sending error:", data);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error sending OTP:", error);
    return false;
  }
}

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

async function emailExistsInFirebase(email: string): Promise<boolean> {
  try {
    const { getMemberByEmail } = await import("../services/membersService");
    return Boolean(await getMemberByEmail(email));
  } catch (error) {
    console.error("Failed to check email in Firebase:", error);
    return false;
  }
}

export default function RegisterPage({ navigate }: { navigate: Navigate }) {
  const { state, ready, dispatch } = useAppStore();
  const code = new URLSearchParams(window.location.search).get("code") ?? "";
  const [step, setStep] = useState<"invite" | "form" | "otp">("invite");
  const [verifiedAdmin, setVerifiedAdmin] = useState<StaffAdmin | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    invitationCode: code,
    accountPassword: "",
    withdrawalPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpTimestamp, setOtpTimestamp] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const getRemainingTime = (): number => {
    if (!otpTimestamp) return 0;
    const elapsed = Math.floor((Date.now() - otpTimestamp) / 1000);
    const remaining = Math.max(0, 300 - elapsed); // 300 seconds = 5 minutes
    return remaining;
  };

  const handleVerifyInvite = (event: React.FormEvent) => {
    event.preventDefault();
    const invitationCode = form.invitationCode.trim();

    if (!ready) {
      setMessage("Invitation codes are still loading. Please try again in a moment.");
      return;
    }

    if (!state.admins.length) {
      setMessage("✗ No admin invitation codes are available yet. Please ask the site owner to create an admin in Firebase.");
      return;
    }

    const admin = state.admins.find((item) => (item.invitationCode ?? item.code) === invitationCode);

    if (!admin) {
      setVerifiedAdmin(null);
      setMessage("✗ Invalid invitation code. Please ask your admin for the correct code.");
      return;
    }

    setVerifiedAdmin(admin);
    setForm((current) => ({ ...current, invitationCode }));
    setMessage(`✓ Invitation verified. You were invited by ${admin.name}.`);
    setStep("form");
  };

  const handleSubmitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!verifiedAdmin) {
      setStep("invite");
      setMessage("✗ Please verify your invitation code first.");
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    setLoading(true);
    setMessage("Checking email in Firebase...");
    const emailAlreadyInFirebase = await emailExistsInFirebase(normalizedEmail);

    if (emailAlreadyInFirebase) {
      setLoading(false);
      setMessage("✗ This email is already registered. Please login instead.");
      return;
    }

    const generatedOtp = generateOTP();
    setSentOtp(generatedOtp);
    setOtpTimestamp(Date.now());
    setOtp("");

    setMessage("Sending OTP to your email...");
    const sent = await sendOTPEmail(form.email, generatedOtp);
    setLoading(false);

    if (sent) {
      setMessage("✓ OTP sent! Check your email (expires in 5 minutes).");
      setStep("otp");
    } else {
      setMessage("✗ Failed to send OTP. Make sure the server is running (npm run server)");
    }
  };

  const handleVerifyOTP = async (event: React.FormEvent) => {
    event.preventDefault();

    // Check if OTP has expired
    if (isOTPExpired(otpTimestamp || 0)) {
      setMessage("✗ OTP has expired. Request a new one.");
      setSentOtp("");
      setOtpTimestamp(null);
      setStep("form");
      return;
    }

    // Check if OTP matches
    if (otp === sentOtp) {
      setLoading(true);
      setMessage("Verifying and saving...");

      if (!verifiedAdmin) {
        setLoading(false);
        setStep("invite");
        setMessage("✗ Please verify your invitation code first.");
        return;
      }

      const normalizedEmail = form.email.trim().toLowerCase();
      const emailAlreadyInFirebase = await emailExistsInFirebase(normalizedEmail);

      if (emailAlreadyInFirebase) {
        setLoading(false);
        setStep("form");
        setMessage("✗ This email is already registered. Please login instead.");
        return;
      }

      // Create member object
      const memberToSave = {
        id: String(Date.now()).slice(-6),
        username: form.username,
        email: normalizedEmail,
        phone: form.phone,
        invitationCode: form.invitationCode,
        referredBy: verifiedAdmin.name,
        level: "Starter" as const,
        balance: verifiedAdmin.registrationBonus ?? 0,
        totalOrders: 0,
        lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
        accountPassword: form.accountPassword,
        withdrawalPassword: form.withdrawalPassword,
      };

      // Save to Firebase first
      const saved = await saveToFirebase(memberToSave);

      setLoading(false);

      if (saved) {
        setActiveCustomerId(memberToSave.id);
        dispatch({
          type: "registerMember",
          payload: {
            id: memberToSave.id,
            username: form.username,
            email: form.email,
            phone: form.phone,
            invitationCode: form.invitationCode,
            accountPassword: form.accountPassword,
            withdrawalPassword: form.withdrawalPassword,
          },
        });
        setMessage("✓ Account registered and saved to Firebase! Redirecting...");
        setTimeout(() => navigate("/"), 2000);
      } else {
        setMessage("✗ Firebase save failed. Check Firebase rules and browser console.");
      }
    } else {
      setMessage("✗ Invalid OTP. Please try again.");
    }
  };

  const remainingTime = getRemainingTime();

  return (
    <main className="grid min-h-screen place-items-center bg-mint px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded bg-white p-6 shadow-panel">
        <button className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-forest" onClick={() => navigate("/")}>
          <Store size={18} />
          Back to store
        </button>
        <h1 className="text-3xl font-black">Create customer account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {step === "invite"
            ? "Enter the invitation code provided by your admin to begin registration."
            : step === "form"
              ? "Complete your account details. Your account will be linked to the verified admin team."
              : "Enter the OTP code sent to your email to verify your account."}
        </p>

        {step === "invite" ? (
          <form className="mt-6 grid gap-3" onSubmit={handleVerifyInvite}>
            <Field label="Invitation code">
              <input
                className={inputClass}
                required
                value={form.invitationCode}
                onChange={(event) => {
                  setVerifiedAdmin(null);
                  setForm({ ...form, invitationCode: event.target.value });
                }}
                placeholder="Enter admin invitation code"
              />
            </Field>
            {message && (
              <p className={`rounded p-3 text-sm font-semibold ${message.includes("✗") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                {message}
              </p>
            )}
            <button className="h-12 w-full rounded bg-forest font-bold text-white hover:bg-forest/90">Continue</button>
          </form>
        ) : step === "form" ? (
          <form className="mt-6 grid gap-3" onSubmit={handleSubmitForm}>
            {verifiedAdmin && (
              <div className="rounded bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                Invitation verified: {verifiedAdmin.name}
              </div>
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
              <input
                className={inputClass}
                required
                value={form.invitationCode}
                readOnly
              />
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
              {loading ? "Checking..." : "Send OTP"}
            </button>
            <button
              type="button"
              className="h-10 w-full rounded border-2 border-forest font-bold text-forest hover:bg-forest/10"
              onClick={() => {
                setStep("invite");
                setMessage("");
              }}
            >
              Change invitation code
            </button>
          </form>
        ) : (
          <form className="mt-6 grid gap-3" onSubmit={handleVerifyOTP}>
            <Field label="Enter OTP code">
              <input
                className={inputClass}
                placeholder="6-digit code"
                required
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
              />
            </Field>
            <div className="text-xs text-slate-500">
              Time remaining: <span className={remainingTime < 60 ? "text-red-600 font-bold" : ""}>{remainingTime}s</span>
            </div>
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
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setOtp("");
                setMessage("");
                setSentOtp("");
                setOtpTimestamp(null);
              }}
              className="h-10 w-full rounded border-2 border-forest font-bold text-forest hover:bg-forest/10"
            >
              Back
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
