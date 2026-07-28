import { ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import type { Navigate } from "../App";
import { Field, inputClass } from "../components/common";
import { setActiveAdminId } from "../services/adminSession";
import { authenticateIdentifier } from "../services/authService";
import { getAdminById } from "../services/adminsService";
import { useAppStore } from "../store/AppStore";

export default function AdminLoginPage({ navigate }: { navigate: Navigate }) {
  const { primeAdminSession } = useAppStore();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const loginInFlight = useRef(false);

  return (
    <main className="grid min-h-screen place-items-center bg-cloud px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded bg-white p-6 shadow-panel">
        <div className="grid h-12 w-12 place-items-center rounded bg-slate-900 text-white">
          <ShieldCheck size={23} />
        </div>
        <h1 className="mt-4 text-3xl font-black">Masuk admin</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Masuk menggunakan akun super admin, admin, atau karyawan.</p>

        <form
          className="mt-6 grid gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (loginInFlight.current) return;
            loginInFlight.current = true;
            setLoading(true);
            setMessage("");
            try {
              const identity = await authenticateIdentifier("admin", username, password);
              const admin = await getAdminById(identity.subjectId);
              if (!admin) throw new Error("Data admin tidak ditemukan.");
              setActiveAdminId(admin.id);
              primeAdminSession(admin);
              navigate("/admin");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Invalid admin username or password.");
            } finally {
              loginInFlight.current = false;
              setLoading(false);
            }
          }}
        >
          <Field label="Nama pengguna">
            <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="superadmin" required disabled={loading} />
          </Field>
          <Field label="Kata sandi">
            <input className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Kata sandi" required disabled={loading} />
          </Field>
          {message && (
            <p className={`rounded p-3 text-sm font-semibold ${message.includes("successful") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </p>
          )}
          <button type="submit" disabled={loading} className="h-12 rounded bg-slate-900 font-bold text-white hover:bg-slate-800 disabled:opacity-60">
            {loading ? "Memeriksa..." : "Masuk"}
          </button>
          <button type="button" className="h-11 rounded border border-slate-200 font-bold text-slate-700 hover:bg-slate-50" onClick={() => navigate("/")}>
            Kembali ke halaman Kerja
          </button>
        </form>

      </section>
    </main>
  );
}
