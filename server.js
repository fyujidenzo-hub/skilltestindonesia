import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { applicationDefault, cert, getApps, initializeApp as initializeAdminApp } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { createHash, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { installNotificationPush } from "./push-notifications.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
let adminAuth = null;
let adminFirestore = null;

function parseServiceAccountJson(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const candidates = [
    trimmed,
    trimmed.replace(/^['"]|['"]$/g, ""),
    Buffer.from(trimmed, "base64").toString("utf8"),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.project_id && parsed?.client_email && parsed?.private_key) {
        return {
          ...parsed,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      // Try the next supported environment-variable format.
    }
  }
  return null;
}

try {
  const expectedProjectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const serviceAccountFile =
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccountFromFile = serviceAccountFile
    ? readFileSync(path.resolve(serviceAccountFile), "utf8")
    : "";
  const serviceAccountFromFields =
    process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY
      ? JSON.stringify({
          project_id: process.env.FIREBASE_PROJECT_ID || expectedProjectId,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: process.env.FIREBASE_PRIVATE_KEY,
        })
      : "";
  const serviceAccount = parseServiceAccountJson(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      serviceAccountFromFile ||
      serviceAccountFromFields,
  );
  const hasApplicationDefaultEnvironment = Boolean(
    process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.K_SERVICE ||
      process.env.FUNCTION_TARGET ||
      process.env.FUNCTION_NAME,
  );

  if (serviceAccount?.project_id && expectedProjectId && serviceAccount.project_id !== expectedProjectId) {
    throw new Error(`Firebase Admin project mismatch: expected ${expectedProjectId}, received ${serviceAccount.project_id}.`);
  }
  if (!serviceAccount && !hasApplicationDefaultEnvironment) {
    throw new Error("Firebase Admin credentials are missing.");
  }
  const credential = serviceAccount ? cert(serviceAccount) : applicationDefault();
  const adminApp = getApps()[0] ?? initializeAdminApp({ credential, projectId: expectedProjectId });
  if (expectedProjectId && adminApp.options.projectId && adminApp.options.projectId !== expectedProjectId) {
    throw new Error(`Firebase Admin project mismatch: expected ${expectedProjectId}, received ${adminApp.options.projectId}.`);
  }
  adminAuth = getAdminAuth(adminApp);
  adminFirestore = getAdminFirestore(adminApp);
} catch (error) {
  console.warn(`Firebase Admin is not configured; privileged account APIs are disabled. ${error.message}`);
}

// Required for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
const allowedOrigins = new Set([
  "https://testkemitraanindonesia.com",
  "https://www.testkemitraanindonesia.com",
  "https://testskillindonesia.com",
  "https://www.testskillindonesia.com",
  "https://trainingtestindonesia.com",
  "https://www.trainingtestindonesia.com",
  "https://skilltestindonesia.com",
  "https://skillmitraindonesia.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.has(origin));
  },
}));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    firebaseAdminReady: Boolean(adminAuth && adminFirestore),
  });
});

const registrationAttempts = new Map();
const identityCheckAttempts = new Map();

function registrationAllowed(ipAddress) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (registrationAttempts.get(ipAddress) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= 5) return false;
  registrationAttempts.set(ipAddress, [...recent, now]);
  return true;
}

function identityCheckAllowed(ipAddress) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const recent = (identityCheckAttempts.get(ipAddress) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= 120) return false;
  identityCheckAttempts.set(ipAddress, [...recent, now]);
  return true;
}

function phoneIdentityVariants(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return [];
  const variants = new Set([digits]);
  if (digits.startsWith("0")) variants.add(`62${digits.slice(1)}`);
  else if (digits.startsWith("62")) variants.add(`0${digits.slice(2)}`);
  else if (digits.startsWith("8")) {
    variants.add(`0${digits}`);
    variants.add(`62${digits}`);
  }
  return [...variants];
}

async function checkRegistrationIdentity(usernameValue, phoneValue) {
  const username = String(usernameValue ?? "").trim();
  const usernameNormalized = normalizedUsername(username);
  const phone = String(phoneValue ?? "").trim();
  const phoneVariants = phoneIdentityVariants(phone);
  let usernameAvailable = null;
  let phoneAvailable = null;

  if (usernameNormalized) {
    const identitySnapshots = await adminFirestore.getAll(
      adminFirestore.collection("identityReservations").doc(identityDocumentId("username", usernameNormalized)),
      adminFirestore.collection("loginIdentifiers").doc(identityDocumentId("memberUsername", usernameNormalized)),
    );
    let usernameExists = identitySnapshots.some((snapshot) => snapshot.exists);
    if (!usernameExists) {
      const [normalizedSnapshot, legacySnapshot] = await Promise.all([
        adminFirestore.collection("members").where("usernameNormalized", "==", usernameNormalized).limit(1).get(),
        adminFirestore.collection("members").where("username", "==", username).limit(1).get(),
      ]);
      usernameExists = !normalizedSnapshot.empty || !legacySnapshot.empty;
    }
    usernameAvailable = !usernameExists;
  }

  if (phoneVariants.length) {
    const identityRefs = phoneVariants.flatMap((variant) => [
      adminFirestore.collection("identityReservations").doc(identityDocumentId("phone", variant)),
      adminFirestore.collection("loginIdentifiers").doc(identityDocumentId("memberPhone", variant)),
    ]);
    const identitySnapshots = await adminFirestore.getAll(...identityRefs);
    let phoneExists = identitySnapshots.some((snapshot) => snapshot.exists);
    if (!phoneExists) {
      const memberSnapshots = await Promise.all(
        phoneVariants.map((variant) =>
          adminFirestore.collection("members").where("phoneNormalized", "==", variant).limit(1).get(),
        ),
      );
      phoneExists = memberSnapshots.some((snapshot) => !snapshot.empty);
      if (!phoneExists) {
        const legacySnapshot = await adminFirestore.collection("members").where("phone", "==", phone).limit(1).get();
        phoneExists = !legacySnapshot.empty;
      }
    }
    phoneAvailable = !phoneExists;
  }

  return { usernameAvailable, phoneAvailable };
}

function hashPin(pin) {
  const salt = randomBytes(16);
  const iterations = 120_000;
  const hash = pbkdf2Sync(pin, salt, iterations, 32, "sha256");
  return `pbkdf2$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

app.post("/api/register/check-identity", async (req, res) => {
  if (!adminFirestore) return res.status(503).json({ error: "Layanan pendaftaran belum dikonfigurasi." });
  if (!identityCheckAllowed(req.ip || "unknown")) {
    return res.status(429).json({ error: "Terlalu banyak pemeriksaan. Coba lagi dalam beberapa menit." });
  }

  try {
    const username = String(req.body?.username ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    if (!username && !phone) {
      return res.status(400).json({ error: "Nama pengguna atau nomor telepon wajib diisi." });
    }
    return res.json(await checkRegistrationIdentity(username, phone));
  } catch (error) {
    console.error("Identity availability check failed:", error);
    return res.status(500).json({ error: "Ketersediaan akun tidak dapat diperiksa." });
  }
});

app.get("/api/register/check-identity", (_req, res) => {
  res.status(405).json({ error: "Endpoint ini menggunakan metode POST." });
});

app.post("/api/register", async (req, res) => {
  if (!adminAuth || !adminFirestore) return res.status(503).json({ error: "Layanan pendaftaran belum dikonfigurasi." });
  if (!registrationAllowed(req.ip || "unknown")) {
    return res.status(429).json({ error: "Terlalu banyak percobaan pendaftaran. Coba lagi dalam 15 menit." });
  }

  let createdUser = null;
  try {
    const username = String(req.body?.username ?? "").trim();
    const usernameNormalized = normalizedUsername(username);
    const phone = String(req.body?.phone ?? "").trim();
    const phoneNormalized = phone.replace(/\D/g, "");
    const phoneVariants = phoneIdentityVariants(phoneNormalized);
    const invitationCode = String(req.body?.invitationCode ?? "").trim();
    const accountPassword = String(req.body?.accountPassword ?? "");
    const withdrawalPin = String(req.body?.withdrawalPin ?? "").trim();
    if (!usernameNormalized || !phoneNormalized || !invitationCode) {
      return res.status(400).json({ error: "Nama pengguna, nomor telepon, dan kode undangan wajib diisi." });
    }
    if (accountPassword.length < 6 || accountPassword.length > 128) {
      return res.status(400).json({ error: "Kata sandi akun harus terdiri dari 6-128 karakter." });
    }
    if (withdrawalPin.length < 4 || withdrawalPin.length > 32) {
      return res.status(400).json({ error: "PIN penarikan harus terdiri dari 4-32 karakter." });
    }

    const memberId = randomUUID();
    const authEmail = `member-${memberId}@accounts.skilltestindonesia.com`;
    const invitationRef = adminFirestore.collection("invitationCodes").doc(invitationCode);
    const usernameReservationRef = adminFirestore.collection("identityReservations").doc(identityDocumentId("username", usernameNormalized));
    const usernameLoginRef = adminFirestore.collection("loginIdentifiers").doc(identityDocumentId("memberUsername", usernameNormalized));
    const phoneReservationRefs = phoneVariants.map((variant) =>
      adminFirestore.collection("identityReservations").doc(identityDocumentId("phone", variant)),
    );
    const phoneLoginRefs = phoneVariants.map((variant) =>
      adminFirestore.collection("loginIdentifiers").doc(identityDocumentId("memberPhone", variant)),
    );
    const [invitationSnapshot, availability] = await Promise.all([
      invitationRef.get(),
      checkRegistrationIdentity(username, phone),
    ]);
    if (!invitationSnapshot.exists || invitationSnapshot.data()?.active !== true) {
      return res.status(400).json({ error: "Kode undangan tidak valid." });
    }
    if (availability.usernameAvailable === false) return res.status(409).json({ error: "Nama pengguna sudah digunakan." });
    if (availability.phoneAvailable === false) return res.status(409).json({ error: "Nomor telepon sudah digunakan." });

    createdUser = await adminAuth.createUser({ email: authEmail, password: accountPassword, displayName: username });
    const invitation = invitationSnapshot.data();
    const member = {
      id: memberId,
      authUid: createdUser.uid,
      authEmail,
      username,
      usernameNormalized,
      phone,
      phoneNormalized,
      invitationCode,
      referredBy: invitation.adminName,
      referredByAdminId: invitation.adminId,
      level: "Starter",
      balance: Number(invitation.registrationBonus || 0),
      totalOrders: 0,
      lastLogin: new Date().toISOString().slice(0, 16).replace("T", " "),
      withdrawalPinHash: hashPin(withdrawalPin),
    };
    const createdAt = new Date().toISOString();

    await adminFirestore.runTransaction(async (transaction) => {
      const identityRefs = [
        usernameReservationRef,
        usernameLoginRef,
        ...phoneReservationRefs,
        ...phoneLoginRefs,
      ];
      const memberRef = adminFirestore.collection("members").doc(memberId);
      const roleRef = adminFirestore.collection("authRoles").doc(createdUser.uid);
      const refs = [
        invitationRef,
        ...identityRefs,
        memberRef,
        roleRef,
      ];
      const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
      if (!snapshots[0].exists || snapshots[0].data()?.active !== true) throw new Error("INVALID_INVITATION");
      if (snapshots[1].exists || snapshots[2].exists) throw new Error("USERNAME_EXISTS");
      if (snapshots.slice(3, 3 + phoneReservationRefs.length + phoneLoginRefs.length).some((snapshot) => snapshot.exists)) {
        throw new Error("PHONE_EXISTS");
      }

      const loginIdentity = {
        scope: "member",
        subjectId: memberId,
        authEmail,
        authUid: createdUser.uid,
        conflict: false,
        createdAt,
      };
      transaction.set(memberRef, member);
      transaction.set(usernameReservationRef, { type: "username", memberId, createdAt });
      transaction.set(usernameLoginRef, loginIdentity);
      phoneReservationRefs.forEach((reference) => {
        transaction.set(reference, { type: "phone", memberId, createdAt });
      });
      phoneLoginRefs.forEach((reference) => {
        transaction.set(reference, loginIdentity);
      });
      transaction.set(roleRef, { role: "member", subjectId: memberId, createdAt });
      if (invitation.adminId) {
        transaction.set(
          adminFirestore.collection("admins").doc(invitation.adminId),
          { registrations: FieldValue.increment(1) },
          { merge: true },
        );
      }
    });

    return res.status(201).json({ memberId });
  } catch (error) {
    if (createdUser) await adminAuth.deleteUser(createdUser.uid).catch(() => {});
    const message = String(error?.message || "");
    if (message === "USERNAME_EXISTS") return res.status(409).json({ error: "Nama pengguna sudah digunakan." });
    if (message === "PHONE_EXISTS") return res.status(409).json({ error: "Nomor telepon sudah digunakan." });
    if (message === "INVALID_INVITATION") return res.status(400).json({ error: "Kode undangan tidak valid." });
    console.error("Registration failed:", error);
    return res.status(500).json({ error: "Akun tidak dapat dibuat." });
  }
});

app.post("/api/admin/members/:memberId/reset-password", requireSuperAdmin, async (req, res) => {
  try {
    const password = String(req.body?.password ?? "");
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Kata sandi harus terdiri dari 6-128 karakter." });
    }
    const memberSnapshot = await adminFirestore.collection("members").doc(req.params.memberId).get();
    if (!memberSnapshot.exists) return res.status(404).json({ error: "Anggota tidak ditemukan." });
    const authUid = memberSnapshot.data()?.authUid;
    if (!authUid) return res.status(409).json({ error: "Akun anggota belum dimigrasikan ke Firebase Authentication." });
    await adminAuth.updateUser(authUid, { password });
    await adminAuth.revokeRefreshTokens(authUid);
    await adminFirestore.collection("securityAuditLogs").add({
      action: "member_password_reset",
      targetMemberId: req.params.memberId,
      actorUid: req.authContext.uid,
      actorAdminId: req.authContext.subjectId,
      createdAt: new Date().toISOString(),
    });
    return res.json({ success: true });
  } catch (error) {
    console.error("Member password reset failed:", error);
    return res.status(500).json({ error: "Kata sandi akun tidak dapat diatur ulang." });
  }
});

const activeOrderStatuses = new Set([
  "pending",
  "pending_confirmation",
  "waiting",
  "waiting_assignment",
  "waiting_shipment",
  "processing",
  "in_progress",
  "assigned",
  "claimed",
  "incomplete",
  "product_assigned",
  "belum_diserahkan",
  "frozen",
]);

function verifyPin(pin, encodedHash) {
  const [scheme, iterationText, saltText, hashText] = String(encodedHash ?? "").split("$");
  if (scheme !== "pbkdf2") return false;
  const iterations = Number(iterationText);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;
  const expected = Buffer.from(hashText, "base64");
  const actual = pbkdf2Sync(pin, Buffer.from(saltText, "base64"), iterations, expected.length, "sha256");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function createOrderReferenceNumber() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const timestamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `PSN-${timestamp}-${suffix}`;
}

app.post("/api/member/orders", requireMember, async (req, res) => {
  try {
    const memberId = req.authContext.subjectId;
    const memberRef = adminFirestore.collection("members").doc(memberId);
    const orderRef = adminFirestore.collection("orders").doc();
    let createdOrder;

    await adminFirestore.runTransaction(async (transaction) => {
      const memberSnapshot = await transaction.get(memberRef);
      if (!memberSnapshot.exists) throw new Error("MEMBER_NOT_FOUND");
      const member = { id: memberSnapshot.id, ...memberSnapshot.data() };
      if (Number(member.balance || 0) <= 0) throw new Error("BALANCE_REQUIRED");

      const activeOrders = await transaction.get(
        adminFirestore.collection("orders").where("memberId", "==", memberId),
      );
      if (activeOrders.docs.some((item) => activeOrderStatuses.has(String(item.data().status).toLowerCase()))) {
        throw new Error("ACTIVE_TASK");
      }

      createdOrder = {
        id: orderRef.id,
        referenceNumber: createOrderReferenceNumber(),
        memberId,
        member: member.username,
        admin: member.referredBy || "",
        productCode: "",
        productName: "",
        quantity: 0,
        assignedProducts: [],
        value: 0,
        commission: 0,
        requiredBalance: 0,
        status: "waiting_assignment",
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        assignedAt: "",
        completedAt: "",
        submittedAt: "",
        shippedAt: "",
        commissionCreditedAt: "",
      };
      transaction.set(orderRef, createdOrder);
    });

    return res.status(201).json({ order: createdOrder });
  } catch (error) {
    const message = String(error?.message || "");
    const knownErrors = {
      MEMBER_NOT_FOUND: [404, "Anggota tidak ditemukan."],
      BALANCE_REQUIRED: [409, "Bonus pendaftaran atau saldo diperlukan untuk menerima pesanan."],
      ACTIVE_TASK: [409, "Anda sudah memiliki tugas aktif. Selesaikan tugas tersebut terlebih dahulu."],
    };
    if (knownErrors[message]) return res.status(knownErrors[message][0]).json({ error: knownErrors[message][1] });
    console.error("Order acceptance failed:", error);
    return res.status(500).json({ error: "Pesanan tidak dapat diterima. Silakan coba lagi." });
  }
});

app.post("/api/member/withdrawals", requireMember, async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const withdrawalPin = String(req.body?.withdrawalPin ?? "").trim();
    const withdrawalBankName = String(req.body?.withdrawalBankName ?? "").trim();
    const withdrawalAccountName = String(req.body?.withdrawalAccountName ?? "").trim();
    const withdrawalAccountNumber = String(req.body?.withdrawalAccountNumber ?? "").trim();
    if (!Number.isSafeInteger(amount) || amount < 100000) {
      return res.status(400).json({ error: "Jumlah penarikan minimum adalah Rp100.000." });
    }
    if (!withdrawalPin || !withdrawalBankName || !withdrawalAccountName || !withdrawalAccountNumber) {
      return res.status(400).json({ error: "PIN dan informasi rekening penarikan wajib diisi." });
    }

    const memberId = req.authContext.subjectId;
    const memberRef = adminFirestore.collection("members").doc(memberId);
    const transactionRef = adminFirestore.collection("transactions").doc();
    let responseTransaction;
    let updatedMember;

    await adminFirestore.runTransaction(async (transaction) => {
      const memberSnapshot = await transaction.get(memberRef);
      if (!memberSnapshot.exists) throw new Error("MEMBER_NOT_FOUND");
      const member = { id: memberSnapshot.id, ...memberSnapshot.data() };
      if (member.withdrawalLocked) throw new Error(`WITHDRAWAL_LOCKED:${String(member.withdrawalRemarks || "")}`);
      if (!member.withdrawalPinHash) throw new Error("PIN_NOT_SET");
      if (!verifyPin(withdrawalPin, member.withdrawalPinHash)) throw new Error("INVALID_PIN");
      if (Number(member.balance || 0) < amount) throw new Error("INSUFFICIENT_BALANCE");

      const orderSnapshot = await transaction.get(
        adminFirestore.collection("orders").where("memberId", "==", memberId),
      );
      if (orderSnapshot.docs.some((item) => activeOrderStatuses.has(String(item.data().status).toLowerCase()))) {
        throw new Error("ACTIVE_TASK");
      }

      const createdAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      const balance = Number(member.balance || 0) - amount;
      responseTransaction = {
        id: transactionRef.id,
        requestId: `WD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        memberId,
        member: member.username,
        admin: member.referredBy || "",
        type: "withdrawal",
        amount,
        status: "pending",
        createdAt,
        senderName: "",
        withdrawalBankName,
        withdrawalAccountName,
        withdrawalAccountNumber,
        proofName: "",
        proofType: "",
        proofDataUrl: "",
        proofUrl: "",
        proofPath: "",
        proofSize: 0,
        creditedAt: "",
        balanceDeductedAt: createdAt,
      };
      updatedMember = { ...member, balance, lastBalanceTransactionId: transactionRef.id };
      transaction.set(transactionRef, responseTransaction);
      transaction.update(memberRef, { balance, lastBalanceTransactionId: transactionRef.id });
    });

    return res.status(201).json({ transaction: responseTransaction, updatedMember });
  } catch (error) {
    const message = String(error?.message || "");
    if (message.startsWith("WITHDRAWAL_LOCKED:")) {
      return res.status(403).json({ error: message.slice("WITHDRAWAL_LOCKED:".length) || "Penarikan dinonaktifkan untuk akun ini." });
    }
    const knownErrors = {
      MEMBER_NOT_FOUND: [404, "Anggota tidak ditemukan."],
      PIN_NOT_SET: [409, "PIN penarikan belum diatur. Hubungi Super Admin."],
      INVALID_PIN: [403, "PIN penarikan salah."],
      INSUFFICIENT_BALANCE: [400, "Saldo tidak mencukupi."],
      ACTIVE_TASK: [409, "Penarikan tidak dapat dilakukan selama masih ada tugas aktif atau belum selesai."],
    };
    if (knownErrors[message]) return res.status(knownErrors[message][0]).json({ error: knownErrors[message][1] });
    console.error("Withdrawal submission failed:", error);
    return res.status(500).json({ error: "Permintaan penarikan tidak dapat diproses." });
  }
});

function normalizedUsername(value) {
  return String(value ?? "").trim().toLowerCase();
}

function identityDocumentId(type, value) {
  return createHash("sha256").update(`${type}:${value}`).digest("hex");
}

function staffAuthEmail(adminId) {
  return `admin-${adminId}@accounts.skilltestindonesia.com`;
}

app.post("/api/admin/staff", requireSuperAdmin, async (req, res) => {
  let createdUser = null;
  try {
    const name = String(req.body?.name ?? "").trim();
    const username = String(req.body?.username ?? "").trim();
    const usernameNormalized = normalizedUsername(username);
    const password = String(req.body?.password ?? "");
    const adminCode = String(req.body?.adminCode ?? "").trim();
    const invitationCode = String(req.body?.invitationCode ?? "").trim();
    const registrationBonus = Math.max(0, Number(req.body?.registrationBonus) || 0);
    const role = req.body?.role === "employee" ? "employee" : "admin";
    if (!name || !usernameNormalized || !adminCode || !invitationCode) {
      return res.status(400).json({ error: "Semua kolom akun staf wajib diisi." });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Kata sandi harus terdiri dari 6-128 karakter." });
    }

    const adminId = adminFirestore.collection("admins").doc().id;
    const authEmail = staffAuthEmail(adminId);
    const loginRef = adminFirestore.collection("loginIdentifiers").doc(identityDocumentId("adminUsername", usernameNormalized));
    const inviteRef = adminFirestore.collection("invitationCodes").doc(invitationCode);
    const [loginSnapshot, inviteSnapshot] = await Promise.all([loginRef.get(), inviteRef.get()]);
    if (loginSnapshot.exists) return res.status(409).json({ error: "Username admin sudah digunakan." });
    if (inviteSnapshot.exists) return res.status(409).json({ error: "Kode undangan sudah digunakan." });

    createdUser = await adminAuth.createUser({ email: authEmail, password, displayName: name });
    const createdAt = new Date().toISOString();
    const staff = {
      id: adminId,
      authUid: createdUser.uid,
      authEmail,
      name,
      username,
      usernameNormalized,
      code: invitationCode,
      adminCode,
      invitationCode,
      registrationBonus,
      registrations: 0,
      todayDeposits: 0,
      monthDeposits: 0,
      todayWithdrawals: 0,
      monthWithdrawals: 0,
      role,
    };
    const batch = adminFirestore.batch();
    batch.set(adminFirestore.collection("admins").doc(adminId), staff);
    batch.set(adminFirestore.collection("authRoles").doc(createdUser.uid), { role, subjectId: adminId, createdAt });
    batch.set(loginRef, { scope: "admin", subjectId: adminId, authUid: createdUser.uid, authEmail, conflict: false, createdAt });
    batch.set(inviteRef, { adminId, invitationCode, adminName: name, registrationBonus, active: true, createdAt });
    batch.set(adminFirestore.collection("securityAuditLogs").doc(), {
      action: "staff_created",
      targetAdminId: adminId,
      actorUid: req.authContext.uid,
      actorAdminId: req.authContext.subjectId,
      createdAt,
    });
    await batch.commit();
    return res.status(201).json({ staff });
  } catch (error) {
    if (createdUser) await adminAuth.deleteUser(createdUser.uid).catch(() => {});
    console.error("Staff creation failed:", error);
    return res.status(500).json({ error: "Akun staf tidak dapat dibuat." });
  }
});

app.delete("/api/admin/staff/:adminId", requireSuperAdmin, async (req, res) => {
  try {
    const adminRef = adminFirestore.collection("admins").doc(req.params.adminId);
    const snapshot = await adminRef.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Akun staf tidak ditemukan." });
    const staff = snapshot.data();
    if (staff.role === "super_admin") return res.status(403).json({ error: "Akun Super Admin tidak dapat dihapus." });

    if (staff.authUid) {
      await adminAuth.deleteUser(staff.authUid).catch((error) => {
        if (error.code !== "auth/user-not-found") throw error;
      });
    }
    const batch = adminFirestore.batch();
    batch.delete(adminRef);
    if (staff.authUid) batch.delete(adminFirestore.collection("authRoles").doc(staff.authUid));
    if (staff.usernameNormalized || staff.username) {
      batch.delete(adminFirestore.collection("loginIdentifiers").doc(identityDocumentId("adminUsername", normalizedUsername(staff.usernameNormalized || staff.username))));
    }
    if (staff.invitationCode || staff.code) {
      batch.delete(adminFirestore.collection("invitationCodes").doc(String(staff.invitationCode || staff.code)));
    }
    batch.set(adminFirestore.collection("securityAuditLogs").doc(), {
      action: "staff_deleted",
      targetAdminId: req.params.adminId,
      actorUid: req.authContext.uid,
      actorAdminId: req.authContext.subjectId,
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
    return res.json({ success: true });
  } catch (error) {
    console.error("Staff deletion failed:", error);
    return res.status(500).json({ error: "Akun staf tidak dapat dihapus." });
  }
});

async function requireSuperAdmin(req, res, next) {
  if (!adminAuth || !adminFirestore) return res.status(503).json({ error: "Firebase Admin belum dikonfigurasi." });
  try {
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Autentikasi diperlukan." });
    const decoded = await adminAuth.verifyIdToken(token);
    const roleSnapshot = await adminFirestore.collection("authRoles").doc(decoded.uid).get();
    const role = roleSnapshot.data();
    if (!roleSnapshot.exists || role?.role !== "super_admin") {
      return res.status(403).json({ error: "Hanya Super Admin yang diizinkan." });
    }
    const adminSnapshot = await adminFirestore.collection("admins").doc(role.subjectId).get();
    if (!adminSnapshot.exists || adminSnapshot.data()?.authUid !== decoded.uid) {
      return res.status(403).json({ error: "Akun Super Admin tidak valid." });
    }
    req.authContext = { uid: decoded.uid, subjectId: role.subjectId };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Sesi autentikasi tidak valid." });
  }
}

async function requireMember(req, res, next) {
  if (!adminAuth || !adminFirestore) return res.status(503).json({ error: "Layanan akun belum dikonfigurasi." });
  try {
    const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Autentikasi diperlukan." });
    const decoded = await adminAuth.verifyIdToken(token);
    const roleSnapshot = await adminFirestore.collection("authRoles").doc(decoded.uid).get();
    const role = roleSnapshot.data();
    if (!roleSnapshot.exists || role?.role !== "member") {
      return res.status(403).json({ error: "Akun anggota diperlukan." });
    }
    const memberSnapshot = await adminFirestore.collection("members").doc(role.subjectId).get();
    if (!memberSnapshot.exists || memberSnapshot.data()?.authUid !== decoded.uid) {
      return res.status(403).json({ error: "Akun anggota tidak valid." });
    }
    req.authContext = { uid: decoded.uid, subjectId: role.subjectId };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Sesi autentikasi tidak valid." });
  }
}

installNotificationPush(app, adminAuth, adminFirestore);

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "API endpoint tidak ditemukan." });
});

// ==================== SERVE REACT ====================

app.use(
  express.static(path.join(__dirname, "dist"), {
    etag: true,
    maxAge: "1y",
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html") || filePath.endsWith("sw.js") || filePath.endsWith("manifest.webmanifest")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ==================== START SERVER ====================

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
