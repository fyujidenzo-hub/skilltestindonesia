import { LockKeyhole, Store } from "lucide-react";
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
        return [member.username, member.email, member.phone].some((value) => value?.toLowerCase() === normalizedIdentifier);
      }),
    [normalizedIdentifier, state.members],
  );

  return (
    <main className="grid min-h-screen place-items-center bg-mint px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded bg-white p-6 shadow-panel">
        <button className="mb-6 hidden inline-flex items-center gap-2 text-sm font-bold text-forest" onClick={() => navigate("/")}>
          <Store size={18} />
          Back to store
        </button>
        <div className="grid h-12 w-12 place-items-center rounded bg-forest text-white">
          <LockKeyhole size={22} />
        </div>
        <h1 className="mt-4 text-3xl font-black">Customer login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in with your username, email, or phone number.</p>

        <form
          className="mt-6 grid gap-3"
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
              className={inputClass}
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="raka.pratama"
            />
          </Field>
          <Field label="Password">
            <input
              className={inputClass}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your account password"
            />
          </Field>
          {message && (
            <p
              className={`rounded p-3 text-sm font-semibold ${
                message.includes("successful") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {message}
            </p>
          )}
          <button className="h-12 rounded bg-forest font-bold text-white hover:bg-forest/90">Login</button>
          <button
            type="button"
            className="h-11 rounded border-2 border-forest font-bold text-forest hover:bg-forest/10"
            onClick={() => navigate("/register")}
          >
            Create account
          </button>
        </form>
      </section>
    </main>
  );
}
