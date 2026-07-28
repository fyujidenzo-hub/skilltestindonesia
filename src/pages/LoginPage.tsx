import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useRef, useState } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveCustomerId } from "../services/customerSession";
import { getMemberById } from "../services/membersService";
import { authenticateIdentifier } from "../services/authService";
import { useAppStore } from "../store/AppStore";

export default function LoginPage({ navigate }: { navigate: Navigate }) {
  const { primeMemberSession } = useAppStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const loginInFlight = useRef(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loginInFlight.current) return;

    loginInFlight.current = true;
    setLoading(true);
    setMessage("");

    try {
      const identity = await authenticateIdentifier("member", identifier, password);
      const liveMember = await getMemberById(identity.subjectId);
      if (!liveMember) throw new Error("Data anggota tidak ditemukan.");

      setActiveCustomerId(liveMember.id);
      primeMemberSession(liveMember);
      navigate("/");
    } catch (error) {
      console.error("Unable to authenticate account:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      const isInvalidCredentials =
        errorMessage.includes("auth/invalid-credential") ||
        errorMessage.includes("auth/wrong-password") ||
        errorMessage.includes("auth/user-not-found") ||
        errorMessage.includes("Akun tidak ditemukan");

      setMessage(
        isInvalidCredentials
          ? "Invalid username or password."
          : "Tidak dapat masuk. Silakan coba lagi."
      );
    } finally {
      loginInFlight.current = false;
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

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/25 bg-white/90 p-8 shadow-[0_25px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-forest text-white shadow-xl">
          <LockKeyhole size={28} />
        </div>

        <h1 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-900">
          Akun Kerja Tokopedia
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Masuk menggunakan nama pengguna, email, atau nomor telepon Anda.
        </p>

        <form
          className="mt-7 grid gap-4"
          onSubmit={handleLogin}
        >
          <Field label="Nama pengguna, email, atau telepon">
            <input
              className={`${inputClass} h-12 rounded-xl border border-slate-200 bg-white/80 px-4 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-200`}
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              disabled={loading}
              placeholder="raka.pratama"
            />
          </Field>

          <Field label="Kata sandi">
            <div className="relative">
              <input
                className={`${inputClass} h-12 w-full rounded-xl border border-slate-200 bg-white/80 py-2 pl-4 pr-14 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-200`}
                required
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                placeholder="Kata sandi akun Anda"
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-forest focus:outline-none focus:ring-2 focus:ring-emerald-200"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </Field>

          {message && (
            <p
              className={`rounded-xl border p-3 text-sm font-semibold ${
                message.startsWith("Login berhasil")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <button type="submit" className="mt-3 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 font-bold text-white shadow-lg transition duration-300 hover:scale-[1.02] hover:from-emerald-700 hover:to-green-800 active:scale-100 disabled:cursor-wait disabled:opacity-70" disabled={loading}>
            {loading ? "Memeriksa..." : "Masuk"}
          </button>

          <button
            type="button"
            className="h-12 rounded-xl border-2 border-emerald-600 bg-white/70 font-bold text-emerald-700 transition hover:bg-emerald-50"
            onClick={() => navigate("/register")}
          >
            Buat Akun
          </button>

          <p className="mt-4 text-center text-xs font-medium text-slate-500">
           Masuk aman • Tokopedia Karir Indonesia
          </p>
        </form>
      </section>
    </main>
  );
}
