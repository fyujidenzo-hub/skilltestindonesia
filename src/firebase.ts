import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);
const firebaseAppName = window.location.pathname.startsWith("/admin")
  ? "admin-session"
  : "[DEFAULT]";
const existingApp = getApps().find((app) => app.name === firebaseAppName);

export const firebaseApp = hasFirebaseConfig
  ? existingApp ??
    (firebaseAppName === "[DEFAULT]"
      ? initializeApp(firebaseConfig)
      : initializeApp(firebaseConfig, firebaseAppName))
  : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export const firebaseReady = Boolean(firebaseApp);
export const authPersistenceReady = auth
  ? setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.warn("Unable to initialize persistent authentication:", error);
    })
  : Promise.resolve();

export function waitForAuthReady(): Promise<User | null> {
  if (!auth) return Promise.resolve(null);
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}
