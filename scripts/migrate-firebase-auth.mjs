import "dotenv/config";
import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { loadFirebaseAdminConfig } from "./firebase-admin-config.mjs";

const shouldApply = process.argv.includes("--apply");
const { projectId, serviceAccount } = await loadFirebaseAdminConfig();

const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount), projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const normalizeUsername = (value) => String(value ?? "").trim().toLocaleLowerCase("id-ID");
const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "");
const keyFor = (type, value) => createHash("sha256").update(`${type}:${value}`).digest("hex");
const completedStatuses = new Set(["completed", "diserahkan"]);

const [memberSnapshot, adminSnapshot, orderSnapshot, transactionSnapshot, settingsSnapshot] = await Promise.all([
  db.collection("members").get(),
  db.collection("admins").get(),
  db.collection("orders").get(),
  db.collection("transactions").get(),
  db.collection("settings").get(),
]);
const members = memberSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const admins = adminSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const orders = orderSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const transactions = transactionSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const settings = settingsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
if (!members.length && !admins.length && !orders.length && !transactions.length) {
  throw new Error("Firestore returned no production data. Migration stopped.");
}

const membersByUsername = groupBy(members, (member) => normalizeUsername(member.username));
const membersByPhone = groupBy(members, (member) => normalizePhone(member.phone));
const adminsByUsername = groupBy(admins, (admin) => normalizeUsername(admin.username));
const adminsByCode = new Map();
for (const admin of admins) {
  for (const code of [admin.code, admin.invitationCode, admin.adminCode]) {
    const normalizedCode = String(code ?? "").trim();
    if (normalizedCode && !adminsByCode.has(normalizedCode)) adminsByCode.set(normalizedCode, admin);
  }
}
const memberIds = new Set(members.map((member) => member.id));
const blocked = [];
const accountPlans = [];
const existingIdentities = [];

for (const member of members) {
  const authUid = String(member.authUid ?? "").trim();
  if (authUid) {
    existingIdentities.push({
      scope: "member",
      subjectId: member.id,
      authUid,
      authEmail: String(member.authEmail ?? `member-${member.id}@accounts.skilltestindonesia.com`).trim(),
    });
    continue;
  }
  const password = String(member.accountPassword ?? "");
  if (!password) {
    blocked.push({ scope: "member", subjectId: member.id, reason: "missing account password" });
    continue;
  }
  accountPlans.push({
    scope: "member",
    subject: member,
    email: `member-${member.id}@accounts.skilltestindonesia.com`,
    password: firebasePassword(password),
  });
}
for (const admin of admins) {
  const authUid = String(admin.authUid ?? "").trim();
  if (authUid) {
    existingIdentities.push({
      scope: "admin",
      subjectId: admin.id,
      authUid,
      authEmail: String(admin.authEmail ?? `admin-${admin.id}@accounts.skilltestindonesia.com`).trim(),
    });
    continue;
  }
  const password = String(admin.password ?? "");
  if (!password) {
    blocked.push({ scope: "admin", subjectId: admin.id, reason: "missing admin password" });
    continue;
  }
  accountPlans.push({
    scope: "admin",
    subject: admin,
    email: `admin-${admin.id}@accounts.skilltestindonesia.com`,
    password: firebasePassword(password),
  });
}

const unresolvedTransactions = transactions
  .filter((item) => !item.memberId || !memberIds.has(String(item.memberId)))
  .filter((item) => !resolveMember(item, membersByUsername))
  .map((item) => ({ id: item.id, member: item.member, admin: item.admin }));
const unresolvedOrders = orders
  .filter((item) => !item.memberId || !memberIds.has(String(item.memberId)))
  .filter((item) => !resolveMember(item, membersByUsername))
  .map((item) => ({ id: item.id, member: item.member, admin: item.admin }));
const summary = {
  mode: shouldApply ? "apply" : "dry-run",
  projectId,
  members: members.length,
  admins: admins.length,
  accountsAlreadyMigrated: existingIdentities.length,
  accountsReady: accountPlans.length,
  blockedAccounts: blocked.length,
  duplicateMemberUsernames: duplicateGroupCount(membersByUsername),
  duplicateMemberPhones: duplicateGroupCount(membersByPhone),
  duplicateAdminUsernames: duplicateGroupCount(adminsByUsername),
  transactionsMissingMemberId: transactions.filter((item) => !item.memberId).length,
  transactionsResolvableByOwnership: transactions.filter((item) => !item.memberId && resolveMember(item, membersByUsername)).length,
  unresolvedTransactions: unresolvedTransactions.length,
  unresolvedOrders: unresolvedOrders.length,
};

await mkdir("exports", { recursive: true });
await writeFile(
  "exports/auth-migration-conflicts.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), projectId, blocked, unresolvedOrders, unresolvedTransactions }, null, 2),
);

if (!shouldApply) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}
if (blocked.length) {
  throw new Error(`Migration blocked: ${blocked.length} accounts have no legacy password. See exports/auth-migration-conflicts.json.`);
}

const identities = [...existingIdentities];
for (let index = 0; index < accountPlans.length; index += 20) {
  const chunk = accountPlans.slice(index, index + 20);
  identities.push(...(await Promise.all(chunk.map(createOrUpdateAuthUser))));
}
const identityBySubject = new Map(identities.map((item) => [`${item.scope}:${item.subjectId}`, item]));
const writes = [];

for (const member of members) {
  const identity = identityBySubject.get(`member:${member.id}`);
  if (!identity) continue;
  const completedByMemberId = orders.filter(
    (order) => String(order.memberId ?? "") === member.id && completedStatuses.has(String(order.status)),
  ).length;
  writes.push({
    collection: "members",
    id: member.id,
    mode: "update",
    data: {
      authUid: identity.authUid,
      authEmail: identity.authEmail,
      usernameNormalized: normalizeUsername(member.username),
      phoneNormalized: normalizePhone(member.phone),
      referredByAdminId: member.referredByAdminId || adminsByCode.get(String(member.invitationCode ?? "").trim())?.id || "",
      totalOrders: Math.max(Number(member.totalOrders ?? 0), completedByMemberId),
      withdrawalPinHash: member.withdrawalPinHash || hashPin(String(member.withdrawalPassword ?? "")),
      accountPassword: FieldValue.delete(),
      withdrawalPassword: FieldValue.delete(),
    },
  });
  writes.push({
    collection: "authRoles",
    id: identity.authUid,
    data: { role: "member", subjectId: member.id, updatedAt: new Date().toISOString() },
  });
}

for (const admin of admins) {
  const identity = identityBySubject.get(`admin:${admin.id}`);
  if (!identity) continue;
  const role = admin.role === "super_admin" ? "super_admin" : admin.role === "admin" ? "admin" : "employee";
  writes.push({
    collection: "admins",
    id: admin.id,
    mode: "update",
    data: {
      authUid: identity.authUid,
      authEmail: identity.authEmail,
      usernameNormalized: normalizeUsername(admin.username ?? ""),
      password: FieldValue.delete(),
    },
  });
  writes.push({
    collection: "authRoles",
    id: identity.authUid,
    data: { role, subjectId: admin.id, updatedAt: new Date().toISOString() },
  });
  const code = String(admin.invitationCode ?? admin.code ?? "").trim();
  if (code) {
    writes.push({
      collection: "invitationCodes",
      id: code,
      data: {
        adminId: admin.id,
        adminName: admin.name,
        registrationBonus: Number(admin.registrationBonus ?? 0),
        active: true,
        updatedAt: new Date().toISOString(),
      },
    });
  }
}

for (const [username, matches] of adminsByUsername) {
  if (!username) continue;
  const identity = matches.length === 1 ? identityBySubject.get(`admin:${matches[0].id}`) : null;
  writes.push({
    collection: "loginIdentifiers",
    id: keyFor("adminUsername", username),
    data: identity
      ? loginIdentity("admin", matches[0].id, identity)
      : conflictIdentity("admin", matches.map((admin) => admin.id)),
  });
}
for (const [username, matches] of membersByUsername) {
  if (!username) continue;
  const identity = matches.length === 1 ? identityBySubject.get(`member:${matches[0].id}`) : null;
  writes.push({
    collection: "identityReservations",
    id: keyFor("username", username),
    data: reservation("username", matches),
  });
  writes.push({
    collection: "loginIdentifiers",
    id: keyFor("memberUsername", username),
    data: identity
      ? loginIdentity("member", matches[0].id, identity)
      : conflictIdentity("member", matches.map((member) => member.id)),
  });
}
for (const [phone, matches] of membersByPhone) {
  if (!phone) continue;
  const identity = matches.length === 1 ? identityBySubject.get(`member:${matches[0].id}`) : null;
  writes.push({
    collection: "identityReservations",
    id: keyFor("phone", phone),
    data: reservation("phone", matches),
  });
  writes.push({
    collection: "loginIdentifiers",
    id: keyFor("memberPhone", phone),
    data: identity
      ? loginIdentity("member", matches[0].id, identity)
      : conflictIdentity("member", matches.map((member) => member.id)),
  });
}

for (const order of orders) {
  if (order.memberId && memberIds.has(String(order.memberId))) continue;
  const member = resolveMember(order, membersByUsername);
  if (member) writes.push({ collection: "orders", id: order.id, mode: "update", data: { memberId: member.id, member: member.username } });
}
for (const transaction of transactions) {
  if (transaction.memberId && memberIds.has(String(transaction.memberId))) continue;
  const member = resolveMember(transaction, membersByUsername);
  if (member) {
    writes.push({
      collection: "transactions",
      id: transaction.id,
      mode: "update",
      data: { memberId: member.id, member: member.username },
    });
  }
}
for (const setting of settings) {
  writes.push({
    collection: "settings",
    id: setting.id,
    mode: "update",
    data: {
      username: FieldValue.delete(),
      password: FieldValue.delete(),
      withdrawalPassword: FieldValue.delete(),
    },
  });
}

for (let index = 0; index < writes.length; index += 350) {
  const batch = db.batch();
  for (const write of writes.slice(index, index + 350)) {
    const reference = db.collection(write.collection).doc(write.id);
    if (write.mode === "update") batch.update(reference, write.data);
    else batch.set(reference, write.data, { merge: true });
  }
  await batch.commit();
}

console.log(JSON.stringify({ ...summary, migratedAuthAccounts: identities.length, firestoreWrites: writes.length }, null, 2));

async function createOrUpdateAuthUser(plan) {
  let user;
  try {
    user = await auth.getUserByEmail(plan.email);
    user = await auth.updateUser(user.uid, { password: plan.password });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({ email: plan.email, password: plan.password });
  }
  return { scope: plan.scope, subjectId: plan.subject.id, authUid: user.uid, authEmail: plan.email };
}

function firebasePassword(value) {
  return value.length >= 6 ? value : value.padEnd(6, "#");
}

function hashPin(pin) {
  if (!pin) return "";
  const salt = randomBytes(16);
  const iterations = 120_000;
  const hash = pbkdf2Sync(pin, salt, iterations, 32, "sha256");
  return `pbkdf2$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function groupBy(items, getKey) {
  const result = new Map();
  for (const item of items) {
    const key = getKey(item);
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return result;
}

function duplicateGroupCount(groups) {
  return [...groups.entries()].filter(([key, items]) => key && items.length > 1).length;
}

function resolveMember(record, groupedMembers) {
  const matches = groupedMembers.get(normalizeUsername(record.member)) ?? [];
  if (matches.length === 1) return matches[0];
  if (matches.length < 2) return null;
  const adminName = normalizeUsername(record.admin);
  const scopedMatches = matches.filter((member) => normalizeUsername(member.referredBy) === adminName);
  return scopedMatches.length === 1 ? scopedMatches[0] : null;
}

function loginIdentity(scope, subjectId, identity) {
  return {
    scope,
    subjectId,
    authEmail: identity.authEmail,
    authUid: identity.authUid,
    conflict: false,
    updatedAt: new Date().toISOString(),
  };
}

function conflictIdentity(scope, subjectIds) {
  return {
    scope,
    subjectId: "",
    subjectIds,
    authEmail: "",
    authUid: "",
    conflict: true,
    updatedAt: new Date().toISOString(),
  };
}

function reservation(type, matches) {
  return {
    type,
    memberId: matches.length === 1 ? matches[0].id : "",
    memberIds: matches.map((member) => member.id),
    conflict: matches.length > 1,
    updatedAt: new Date().toISOString(),
  };
}
