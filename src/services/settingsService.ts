import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface AppSettings {
  username: string;
  password: string;
  withdrawalPassword: string;
  siteUrl?: string;
  customerServiceTelegramUrl?: string;
}

const COLLECTION = "settings";
const SETTINGS_DOC = "account";

export async function getSettings(): Promise<AppSettings | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, SETTINGS_DOC));
  return snapshot.exists() ? (snapshot.data() as AppSettings) : null;
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await setDoc(doc(db, COLLECTION, SETTINGS_DOC), settings, { merge: true });
}
