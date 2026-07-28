import { Store } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveCustomerId } from "../services/customerSession";
import { authenticateIdentifier } from "../services/authService";
import { getMemberById } from "../services/membersService";
import { checkRegistrationIdentity, registerMemberAccount } from "../services/registrationService";
import { useAppStore } from "../store/AppStore";

async function verifyInvitationCode(code: string): Promise<{
  verified: boolean;
  adminName: string;
}> {
  try {
    const { getInvitation } = await import("../services/invitationService");
    const invitation = await getInvitation(code);

    return {
      verified: !!invitation,
      adminName: invitation?.adminName || "",
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
    phone: "",
    invitationCode: code,
    accountPassword: "",
    withdrawalPassword: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedAdmin, setVerifiedAdmin] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");
  const [phoneStatus, setPhoneStatus] = useState<"idle" | "checking" | "available" | "taken" | "error">("idle");

  const fieldStyle = `${inputClass} h-12 rounded-xl border-slate-200 bg-slate-50 px-4 focus:border-forest focus:bg-white focus:ring-2 focus:ring-emerald-100`;

  const messageStyle = `rounded-xl p-3 text-sm font-semibold ${
    message.includes("✗")
      ? "bg-red-50 text-red-700"
      : "bg-emerald-50 text-emerald-700"
  }`;

  useEffect(() => {
    const username = form.username.trim();
    if (!verified || username.length < 3) {
      setUsernameStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const result = await checkRegistrationIdentity({ username }, controller.signal);
        setUsernameStatus(result.usernameAvailable ? "available" : "taken");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setUsernameStatus("error");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.username, verified]);

  useEffect(() => {
    const phone = form.phone.trim();
    const digits = phone.replace(/\D/g, "");
    if (!verified || digits.length < 8) {
      setPhoneStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPhoneStatus("checking");
      try {
        const result = await checkRegistrationIdentity({ phone }, controller.signal);
        setPhoneStatus(result.phoneAvailable ? "available" : "taken");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setPhoneStatus("error");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.phone, verified]);

  const handleVerifyCode = async (e: FormEvent) => {
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
      setMessage("✗ Kode undangan tidak valid");
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.username.trim()) {
      setMessage("✗ Nama pengguna wajib diisi.");
      return;
    }

    const phone = form.phone.trim();
    if (!phone) {
      setMessage("✗ Nomor telepon wajib diisi.");
      return;
    }

    if (!form.accountPassword.trim()) {
      setMessage("✗ Kata sandi diperlukan.");
      return;
    }

    if (!form.withdrawalPassword.trim()) {
      setMessage("✗ Kata sandi penarikan diperlukan.");
      return;
    }

    if (usernameStatus === "taken") {
      setMessage("✗ Nama pengguna sudah digunakan.");
      return;
    }

    if (phoneStatus === "taken") {
      setMessage("✗ Nomor telepon sudah digunakan.");
      return;
    }

    setLoading(true);
    setMessage("Memeriksa data akun...");

    try {
      const availability = await checkRegistrationIdentity({
        username: form.username.trim(),
        phone,
      });
      if (availability.usernameAvailable === false) {
        setUsernameStatus("taken");
        throw new Error("Nama pengguna sudah digunakan.");
      }
      if (availability.phoneAvailable === false) {
        setPhoneStatus("taken");
        throw new Error("Nomor telepon sudah digunakan.");
      }
      setMessage("Membuat akun...");
      const registration = await registerMemberAccount({
        username: form.username.trim(),
        phone,
        invitationCode: form.invitationCode.trim(),
        accountPassword: form.accountPassword,
        withdrawalPin: form.withdrawalPassword,
      });
      await authenticateIdentifier("member", form.username, form.accountPassword);
      const savedMember = await getMemberById(registration.memberId);
      if (!savedMember) throw new Error("Data anggota tidak ditemukan setelah pendaftaran.");
      dispatch({ type: "updateMember", payload: savedMember });

      setActiveCustomerId(registration.memberId);
      setMessage("✓ Akun berhasil dibuat! Mengalihkan...");
      setTimeout(() => navigate("/"), 1500);
    } catch (error) {
      setMessage(error instanceof Error ? `✗ ${error.message}` : "✗ Gagal menyimpan. Silakan coba lagi.");
    } finally {
      setLoading(false);
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
          Kembali ke Masuk
        </button>

        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          Buat Akun Kerja
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Lengkapi detail akun Anda. Akun Anda akan ditautkan ke
          tim admin yang telah diverifikasi.
        </p>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          Catatan: Anda memerlukan kode undangan dari pihak yang mereferensikan Anda untuk membuat akun.
          Jika Anda belum memiliki kode, silakan hubungi pihak yang mereferensikan Anda atau admin untuk mendapatkan bantuan.
        </div>
        {!verified ? (
          <form className="mt-7 grid gap-4" onSubmit={handleVerifyCode}>
            <Field label="Kode undangan">
              <input
                className={fieldStyle}
                required
                placeholder="Masukkan kode undangan Anda"
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
              {loading ? "Memverifikasi..." : "Verifikasi Kode"}
            </button>
          </form>
        ) : (
          <form className="mt-7 grid gap-4" onSubmit={handleRegister}>
            {verifiedAdmin && (
              <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                ✓ Undangan telah diverifikasi: {verifiedAdmin}
              </div>
            )}

            <Field label="Nama pengguna">
              <input
                className={fieldStyle}
                required
                minLength={3}
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
              <IdentityStatus status={usernameStatus} kind="username" />
            </Field>

            <Field label="Nomor telepon">
              <input
                className={fieldStyle}
                required
                inputMode="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
              />
              <IdentityStatus status={phoneStatus} kind="phone" />
            </Field>

            <Field label="Kode undangan">
              <input
                className={`${fieldStyle} cursor-not-allowed opacity-70`}
                disabled
                value={form.invitationCode}
              />
            </Field>

            <Field label="Kata sandi">
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

            <Field label="Kata sandi penarikan">
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
              disabled={loading || usernameStatus === "checking" || phoneStatus === "checking" || usernameStatus === "taken" || phoneStatus === "taken"}
              className="h-12 w-full rounded-xl bg-forest font-bold text-white shadow-md transition hover:bg-forest/90 disabled:bg-slate-400"
            >
              {loading ? "Membuat..." : "Buat Akun"}
            </button>

            <button
              type="button"
              onClick={() => {
                setVerified(false);
                setMessage("");
              }}
              className="h-12 w-full rounded-xl border-2 border-forest font-bold text-forest transition hover:bg-forest/10"
            >
              Ubah kode undangan
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function IdentityStatus({
  status,
  kind,
}: {
  status: "idle" | "checking" | "available" | "taken" | "error";
  kind: "username" | "phone";
}) {
  if (status === "idle") return null;
  const label = kind === "username" ? "Nama pengguna" : "Nomor telepon";
  if (status === "checking") return <p className="mt-1 text-xs font-semibold text-slate-500">Memeriksa {label.toLowerCase()}...</p>;
  if (status === "available") return <p className="mt-1 text-xs font-semibold text-emerald-700">{label} tersedia.</p>;
  if (status === "taken") return <p className="mt-1 text-xs font-semibold text-red-700">{label} sudah digunakan.</p>;
  return <p className="mt-1 text-xs font-semibold text-amber-700">Pemeriksaan gagal. Data akan diperiksa lagi saat mendaftar.</p>;
}
