import { createHash } from "node:crypto";
import { getMessaging } from "firebase-admin/messaging";
import { FieldValue } from "firebase-admin/firestore";

const MAX_DEVICES_PER_ACCOUNT = 10;

function tokenId(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function authenticate(auth, firestore, req, res, next) {
  try {
    const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!bearer) return res.status(401).json({ error: "Autentikasi diperlukan." });
    const decoded = await auth.verifyIdToken(bearer);
    const role = (await firestore.collection("authRoles").doc(decoded.uid).get()).data();
    if (!role?.subjectId || !["member", "super_admin", "admin", "employee"].includes(role.role)) {
      return res.status(403).json({ error: "Akun tidak valid." });
    }
    const account = await firestore.collection(role.role === "member" ? "members" : "admins").doc(role.subjectId).get();
    if (!account.exists || account.data()?.authUid !== decoded.uid) return res.status(403).json({ error: "Akun tidak valid." });
    req.notificationUid = decoded.uid;
    return next();
  } catch { return res.status(401).json({ error: "Sesi autentikasi tidak valid." }); }
}

async function memberForRecord(firestore, record) {
  if (!record.memberId) return null;
  const snapshot = await firestore.collection("members").doc(record.memberId).get();
  return snapshot.exists ? snapshot.data() : null;
}

async function staffUidsForMember(firestore, member) {
  const [superAdmins, referrer] = await Promise.all([
    firestore.collection("admins").where("role", "==", "super_admin").get(),
    member.referredByAdminId ? firestore.collection("admins").doc(member.referredByAdminId).get() : Promise.resolve(null),
  ]);
  const recipients = new Set(superAdmins.docs.map((item) => item.data().authUid).filter(Boolean));
  if (referrer?.exists && referrer.data()?.authUid) recipients.add(referrer.data().authUid);
  return [...recipients];
}

function isRecent(value) {
  if (!value) return false;
  const normalized = String(value).trim().replace(" ", "T");
  const time = Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized}Z`);
  return Number.isFinite(time) && Date.now() - time < 2 * 60 * 1000 && time - Date.now() < 60 * 1000;
}

async function sendGenericPush(firestore, messaging, uids, eventId, scope) {
  for (const uid of new Set(uids.filter(Boolean))) {
    const devices = await firestore.collection("notificationDeviceTokens").where("uid", "==", uid).get();
    if (devices.empty) continue;
    const claim = firestore.collection("notificationPushDispatches").doc(tokenId(`${uid}:${eventId}`));
    try {
      await claim.create({ uid, eventId, createdAt: FieldValue.serverTimestamp() });
    } catch (error) {
      if (error?.code === 6 || error?.code === "already-exists") continue;
      throw error;
    }
    const results = await messaging.sendEachForMulticast({
      tokens: devices.docs.map((item) => item.data().token),
      data: {
        title: "Tokopedia",
        body: "Anda memiliki notifikasi baru. Buka aplikasi untuk melihatnya.",
        path: scope === "admin" ? "/admin" : "/",
      },
      webpush: { headers: { TTL: "3600" } },
    });
    await Promise.all(results.responses.map(async (result, index) => {
      const code = result.error?.code;
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        await devices.docs[index].ref.delete().catch(() => {});
      } else if (result.error) {
        console.warn("Generic push delivery failed", { eventId, code });
      }
    }));
  }
}

function dispatch(firestore, messaging, uids, eventId, scope) {
  void sendGenericPush(firestore, messaging, uids, eventId, scope)
    .catch((error) => console.warn("Unable to send generic notification", error));
}

function watch(firestore, collectionName, onChange) {
  const previous = new Map();
  firestore.collection(collectionName).onSnapshot((snapshot) => {
    for (const change of snapshot.docChanges()) {
      const id = change.doc.id;
      const before = previous.get(id) ?? null;
      if (change.type === "removed") { previous.delete(id); continue; }
      const current = change.doc.data();
      previous.set(id, current);
      void onChange(id, current, before).catch((error) => console.warn("Notification event processing failed", { collectionName, id, error }));
    }
  }, (error) => console.error(`Notification listener stopped for ${collectionName}:`, error));
}

export function startEventWatchers(firestore, messaging) {
  watch(firestore, "members", async (id, member, before) => {
    if (before || !isRecent(member.lastLogin)) return;
    dispatch(firestore, messaging, await staffUidsForMember(firestore, member), `member-${id}-registered`, "admin");
  });
  watch(firestore, "transactions", async (id, transaction, before) => {
    const newRequest = !before && isRecent(transaction.createdAt) && transaction.type !== "reward";
    const decision = before && before.status !== transaction.status && ["approved", "rejected"].includes(transaction.status);
    if (!newRequest && !decision) return;
    const member = await memberForRecord(firestore, transaction);
    if (!member) return;
    if (newRequest) dispatch(firestore, messaging, await staffUidsForMember(firestore, member), `transaction-${id}-created`, "admin");
    if (decision) dispatch(firestore, messaging, [member.authUid], `transaction-${id}-${transaction.status}`, "customer");
  });
  watch(firestore, "orders", async (id, order, before) => {
    const created = !before && isRecent(order.createdAt);
    const assigned = before && !before.assignedAt && Boolean(order.assignedAt);
    const submitted = before && !before.submittedAt && Boolean(order.submittedAt);
    const rejected = before && before.status !== order.status && order.status === "rejected";
    const frozen = before && before.status !== order.status && order.status === "frozen";
    const completed = before && before.status !== order.status && ["completed", "diserahkan"].includes(order.status);
    if (!created && !assigned && !submitted && !rejected && !frozen && !completed) return;
    const member = await memberForRecord(firestore, order);
    if (!member) return;
    if (created) dispatch(firestore, messaging, await staffUidsForMember(firestore, member), `order-${id}-created`, "admin");
    if (assigned) dispatch(firestore, messaging, [member.authUid], `order-${id}-assigned`, "customer");
    if (submitted) dispatch(firestore, messaging, [member.authUid], `order-${id}-submitted`, "customer");
    if (rejected) dispatch(firestore, messaging, [member.authUid], `order-${id}-rejected`, "customer");
    if (frozen) dispatch(firestore, messaging, [member.authUid], `order-${id}-frozen`, "customer");
    if (completed) {
      dispatch(firestore, messaging, [member.authUid], `order-${id}-completed`, "customer");
      dispatch(firestore, messaging, await staffUidsForMember(firestore, member), `order-${id}-completed`, "admin");
    }
  });
}

export function installNotificationPush(app, auth, firestore) {
  if (!auth || !firestore) return;
  const messaging = getMessaging();
  const requireAccount = (req, res, next) => authenticate(auth, firestore, req, res, next);
  app.post("/api/notifications/devices", requireAccount, async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[A-Za-z0-9:._-]{100,4096}$/.test(token)) {
      return res.status(400).json({ error: "Token perangkat tidak valid." });
    }
    try {
      const reference = firestore.collection("notificationDeviceTokens").doc(tokenId(token));
      await reference.set({ uid: req.notificationUid, token, createdAt: FieldValue.serverTimestamp() });
      const devices = await firestore.collection("notificationDeviceTokens").where("uid", "==", req.notificationUid).get();
      if (devices.size > MAX_DEVICES_PER_ACCOUNT) {
        const oldest = devices.docs.sort((a, b) => (a.data().createdAt?.toMillis() || 0) - (b.data().createdAt?.toMillis() || 0));
        await Promise.all(oldest.slice(0, devices.size - MAX_DEVICES_PER_ACCOUNT).map((item) => item.ref.delete()));
      }
      return res.status(201).json({ enabled: true });
    } catch (error) { console.error("Device registration failed:", error); return res.status(503).json({ error: "Notifikasi perangkat belum tersedia." }); }
  });
  app.delete("/api/notifications/devices/current", requireAccount, async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== "string" || token.length > 4096) return res.status(400).json({ error: "Token perangkat tidak valid." });
    try {
      const reference = firestore.collection("notificationDeviceTokens").doc(tokenId(token));
      const snapshot = await reference.get();
      if (snapshot.exists && snapshot.data()?.uid === req.notificationUid) await reference.delete();
      return res.status(204).end();
    } catch { return res.status(503).json({ error: "Notifikasi perangkat belum tersedia." }); }
  });
  startEventWatchers(firestore, messaging);
}
