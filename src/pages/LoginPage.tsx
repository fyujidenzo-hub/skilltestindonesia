import { LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveCustomerId } from "../services/customerSession";
import { useAppStore } from "../store/AppStore";

export default function LoginPage({ navigate }: { navigate: Navigate }) {
  const { state, ready } = useAppStore();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const normalizedIdentifier = identifier.trim().toLowerCase();

  const matchedMember = useMemo(
    () =>
      state.members.find((member) => {
        return [member.username, member.email, member.phone].some(
          (value) => value?.toLowerCase() === normalizedIdentifier,
        );
      }),
    [normalizedIdentifier, state.members],
  );

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
          Tokopedia Work Account
        </h1>

        <p className="mt-2 text-center text-sm leading-6 text-slate-500">
          Sign in using your username, email, or phone number.
        </p>

        <form
          className="mt-7 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();

            if (!ready) {
              setMessage("Account data is still loading. Please try again in a moment.");
              return;
            }

            if (!matchedMember) {
              setMessage("No customer account found with those details.");
              return;
            }

            if (!matchedMember.accountPassword) {
              setMessage("This sample account has no password. Please use a registered account.");
              return;
            }

            if (matchedMember.accountPassword !== password) {
              setMessage("Incorrect password.");
              return;
            }

            setActiveCustomerId(matchedMember.id);
            setMessage("Login successful. Redirecting...");
            setTimeout(() => navigate("/"), 500);
          }}
        >
          <Field label="Username, email, or phone">
            <input
              className={`${inputClass} h-12 rounded-xl border border-slate-200 bg-white/80 px-4 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-200`}
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="raka.pratama"
            />
          </Field>

          <Field label="Password">
            <input
              className={`${inputClass} h-12 rounded-xl border border-slate-200 bg-white/80 px-4 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-200`}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your account password"
            />
          </Field>

          {message && (
            <p
              className={`rounded-xl border p-3 text-sm font-semibold ${
                message.includes("successful")
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}

          <button className="mt-3 h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 font-bold text-white shadow-lg transition duration-300 hover:scale-[1.02] hover:from-emerald-700 hover:to-green-800 active:scale-100">
            Login
          </button>

          <button
            type="button"
            className="h-12 rounded-xl border-2 border-emerald-600 bg-white/70 font-bold text-emerald-700 transition hover:bg-emerald-50"
            onClick={() => navigate("/register")}
          >
            Create Account
          </button>

          <p className="mt-4 text-center text-xs font-medium text-slate-500">
            Secure login • Tokopedia Karir Indonesia
          </p>
        </form>
      </section>
    </main>
  );
}