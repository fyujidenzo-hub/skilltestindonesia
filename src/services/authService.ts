import {
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, authPersistenceReady, db, waitForAuthReady } from "../firebase";
import { identityKey, type IdentityKeyType } from "./identityKey";
import { normalizePhone, normalizeUsername } from "./memberOwnership";

type LoginScope = "member" | "admin";

type LoginIdentity = {
  scope: LoginScope;
  subjectId: string;
  authEmail: string;
  authUid?: string;
  conflict?: boolean;
};

export type AuthContext = {
  role: "member" | "super_admin" | "admin" | "employee";
  subjectId: string;
  uid: string;
};

export async function authenticateIdentifier(scope: LoginScope, identifier: string, password: string) {
  if (!auth || !db) throw new Error("Autentikasi Firebase belum dikonfigurasi.");
  const identity = await resolveLoginIdentity(scope, identifier);
  if (!identity) throw new Error("Akun tidak ditemukan.");
  if (identity.conflict || !identity.authEmail) {
    throw new Error(scope === "member" ? "Nama pengguna digunakan oleh beberapa akun. Masuk menggunakan nomor telepon." : "Username admin tidak unik.");
  }

  await authPersistenceReady;
  const credential = await signInWithEmailAndPassword(auth, identity.authEmail, normalizeFirebasePassword(password));
  if (identity.authUid && credential.user.uid !== identity.authUid) {
    await signOut(auth);
    throw new Error("Identitas akun tidak cocok.");
  }

  return { ...identity, user: credential.user };
}

export async function updateCurrentAccountPassword(password: string) {
  if (!auth?.currentUser) throw new Error("Sesi autentikasi tidak aktif.");
  await updatePassword(auth.currentUser, password);
}

function normalizeFirebasePassword(password: string) {
  return password.length >= 6 ? password : password.padEnd(6, "#");
}

export async function clearAuthenticatedSession() {
  if (auth) await signOut(auth);
}

export async function getAuthContext(): Promise<AuthContext | null> {
  if (!db) return null;
  const user = await waitForAuthReady();
  if (!user) return null;
  const snapshot = await getDoc(doc(db, "authRoles", user.uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    role: data.role,
    subjectId: data.subjectId,
    uid: user.uid,
  } as AuthContext;
}

async function resolveLoginIdentity(scope: LoginScope, identifier: string): Promise<LoginIdentity | null> {
  if (!db) return null;
  const normalizedUsername = normalizeUsername(identifier);
  const normalizedPhone = normalizePhone(identifier);
  const candidates: Array<{ type: IdentityKeyType; value: string }> =
    scope === "admin"
      ? [{ type: "adminUsername", value: normalizedUsername }]
      : /^\D*$/.test(identifier.replace(/[\s()+-]/g, ""))
        ? [{ type: "memberUsername", value: normalizedUsername }]
        : [
            { type: "memberPhone", value: normalizedPhone },
            { type: "memberUsername", value: normalizedUsername },
          ];

  for (const candidate of candidates) {
    if (!candidate.value) continue;
    const snapshot = await getDoc(doc(db, "loginIdentifiers", await identityKey(candidate.type, candidate.value)));
    if (snapshot.exists()) return snapshot.data() as LoginIdentity;
  }

  return null;
}
