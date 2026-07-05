import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveAdminId } from "../services/adminSession";
import { useAppStore } from "../store/AppStore";

export default function AdminLoginPage({ navigate }: { navigate: Navigate }) {
  const { state, ready } = useAppStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main className="grid min-h-screen place-items-center bg-cloud px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded bg-white p-6 shadow-panel">
        <div className="grid h-12 w-12 place-items-center rounded bg-slate-900 text-white">
          <ShieldCheck size={23} />
        </div>
        <h1 className="mt-4 text-3xl font-black">Login admin</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Masuk menggunakan akun super admin, admin, atau karyawan.</p>

        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();

            if (!ready) {
              setMessage("Admin data is still loading. Please try again.");
              return;
            }

            const admin = state.admins.find((item) => item.username?.toLowerCase() === username.trim().toLowerCase());
            if (!admin || !admin.password || admin.password !== password) {
              setMessage("Invalid admin username or password.");
              return;
            }

            setActiveAdminId(admin.id);
            setMessage("Login successful. Redirecting...");
            setTimeout(() => navigate("/admin"), 400);
          }}
        >
          <Field label="Username">
            <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="superadmin" required />
          </Field>
          <Field label="Password">
            <input className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" required />
          </Field>
          {message && (
            <p className={`rounded p-3 text-sm font-semibold ${message.includes("successful") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </p>
          )}
          <button className="h-12 rounded bg-slate-900 font-bold text-white hover:bg-slate-800">Masuk</button>
          <button type="button" className="h-11 rounded border border-slate-200 font-bold text-slate-700 hover:bg-slate-50" onClick={() => navigate("/")}>
            Kembali ke halaman Kerja
          </button>
        </form>

      </section>
    </main>
  );
}
