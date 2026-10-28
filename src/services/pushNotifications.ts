import { deleteToken, getMessaging, getToken, isSupported } from "firebase/messaging";
import { auth, firebaseApp } from "../firebase";

// This public key belongs to the Tokopedia Firebase project. An environment
// value can override it if the project rotates its Web Push certificate.
const projectVapidKey = import.meta.env.VITE_FIREBASE_PROJECT_ID === "skilltestindonesia-36a6f"
  ? "BDlcFw92a4v-ne2zvw5APAn4tNydlAU5mNBXOCldGuUN3JREByurIEu49rYx9kfL2YHtaEiChruvzyCfBO-Or-c"
  : "";
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim() || projectVapidKey;
const tokenStorageKey = "tokopedia-notification-device-token";

export function isIosWithoutHomeScreenInstall() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return ios && !standalone;
}

export function pushAvailable() {
  return Boolean(firebaseApp && vapidKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
}

async function deviceRequest(method: "POST" | "DELETE", path: string, token: string) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sesi akun belum siap.");
  const response = await fetch(`/api/notifications/devices${path}`, {
    method,
    headers: { "content-type": "application/json", authorization: `Bearer ${await user.getIdToken()}` },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Notifikasi perangkat belum tersedia.");
  }
}

async function registerDevice() {
  if (!pushAvailable() || !await isSupported()) throw new Error("Browser ini tidak mendukung notifikasi perangkat.");
  if (isIosWithoutHomeScreenInstall()) throw new Error("Di iPhone, tambahkan situs ini ke Layar Utama melalui Safari, lalu buka aplikasinya untuk mengaktifkan notifikasi.");
  if (Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const token = await getToken(getMessaging(firebaseApp!), { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Browser tidak mengembalikan token notifikasi.");
  await deviceRequest("POST", "", token);
  window.sessionStorage.setItem(tokenStorageKey, token);
  return true;
}

export async function enablePushNotifications() {
  if (!pushAvailable()) throw new Error("Browser ini tidak mendukung notifikasi perangkat.");
  if (isIosWithoutHomeScreenInstall()) throw new Error("Di iPhone, tambahkan situs ini ke Layar Utama melalui Safari, lalu buka aplikasinya untuk mengaktifkan notifikasi.");
  // Request permission before the first await so the browser keeps the click gesture.
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission === "denied") throw new Error("Notifikasi diblokir. Izinkan di pengaturan browser atau perangkat.");
  if (permission !== "granted") return false;
  return registerDevice();
}

export async function syncGrantedPushNotifications() {
  if (!pushAvailable() || Notification.permission !== "granted") return false;
  return registerDevice();
}

export async function detachCurrentPushToken() {
  const token = window.sessionStorage.getItem(tokenStorageKey);
  if (token && auth?.currentUser) await deviceRequest("DELETE", "/current", token).catch(() => undefined);
  window.sessionStorage.removeItem(tokenStorageKey);
  if (firebaseApp && await isSupported().catch(() => false)) {
    await deleteToken(getMessaging(firebaseApp)).catch(() => undefined);
  }
}
