import "dotenv/config";
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const shouldApply = process.argv.includes("--apply");
const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!projectId || !serviceAccountJson) throw new Error("VITE_FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON are required.");
const serviceAccount = JSON.parse(serviceAccountJson);
if (serviceAccount.project_id !== projectId) {
  throw new Error(`Service account project mismatch: expected ${projectId}, received ${serviceAccount.project_id}.`);
}

const normalizeUsername = (value) => String(value ?? "").trim().toLocaleLowerCase("id-ID");
const normalizePhone = (value) => String(value ?? "").replace(/\D/g, "");
const reservationId = (type, value) => createHash("sha256").update(`${type}:${value}`).digest("hex");
const completedStatuses = new Set(["completed", "diserahkan"]);
const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount), projectId });
const db = getFirestore(app);
const [memberSnapshot, orderSnapshot, transactionSnapshot] = await Promise.all([
  db.collection("members").get(),
  db.collection("orders").get(),
  db.collection("transactions").get(),
]);
const members = memberSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const orders = orderSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
const transactions = transactionSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
if (!members.length && !orders.length && !transactions.length) {
  throw new Error("Firestore returned no production data. Check network access and project configuration before continuing.");
}
const membersById = new Map(members.map((member) => [member.id, member]));
const membersByUsername = groupBy(members, (member) => normalizeUsername(member.username));
const membersByPhone = groupBy(members, (member) => normalizePhone(member.phone));
const memberUpdates = [];
const orderUpdates = [];
const transactionUpdates = [];
const reservations = [];
const conflicts = [];

for (const member of members) {
  const completedByMemberId = orders.filter(
    (order) => String(order.memberId ?? "") === member.id && completedStatuses.has(String(order.status)),
  ).length;
  const storedTotal = Number(member.totalOrders ?? 0);
  const nextTotal = Math.max(storedTotal, completedByMemberId);
  const update = {
    usernameNormalized: normalizeUsername(member.username),
    phoneNormalized: normalizePhone(member.phone),
  };
  if (nextTotal !== storedTotal) update.totalOrders = nextTotal;
  memberUpdates.push({ id: member.id, data: update });
}

for (const order of orders) {
  if (order.memberId && membersById.has(String(order.memberId))) continue;
  const member = resolveMember(order);
  if (member) {
    orderUpdates.push({ id: order.id, data: { memberId: member.id, member: member.username } });
  } else {
    const matches = membersByUsername.get(normalizeUsername(order.member)) ?? [];
    conflicts.push({ collection: "orders", id: order.id, reason: `username matched ${matches.length} members` });
  }
}

for (const transaction of transactions) {
  if (transaction.memberId && membersById.has(String(transaction.memberId))) continue;
  const member = resolveMember(transaction);
  if (member) {
    transactionUpdates.push({
      id: transaction.id,
      data: { memberId: member.id, member: member.username },
    });
  } else {
    const matches = membersByUsername.get(normalizeUsername(transaction.member)) ?? [];
    conflicts.push({
      collection: "transactions",
      id: transaction.id,
      reason: `username matched ${matches.length} members`,
    });
  }
}

for (const [username, matches] of membersByUsername) {
  if (!username) continue;
  reservations.push({
    id: reservationId("username", username),
    data: reservationData("username", matches),
  });
}
for (const [phone, matches] of membersByPhone) {
  if (!phone) continue;
  reservations.push({
    id: reservationId("phone", phone),
    data: reservationData("phone", matches),
  });
}

const summary = {
  mode: shouldApply ? "apply" : "dry-run",
  projectId,
  memberUpdates: memberUpdates.length,
  orderUpdates: orderUpdates.length,
  transactionUpdates: transactionUpdates.length,
  identityReservations: reservations.length,
  conflicts: conflicts.length,
  conflictBreakdown: Object.fromEntries(
    [...new Set(conflicts.map((item) => item.collection))].map((name) => [
      name,
      conflicts.filter((item) => item.collection === name).length,
    ]),
  ),
};

if (shouldApply) {
  await commitWrites("members", memberUpdates);
  await commitWrites("orders", orderUpdates);
  await commitWrites("transactions", transactionUpdates);
  await commitWrites("identityReservations", reservations, true);
}

console.log(JSON.stringify(summary, null, 2));

function groupBy(items, getKey) {
  const result = new Map();
  for (const item of items) {
    const key = getKey(item);
    result.set(key, [...(result.get(key) ?? []), item]);
  }
  return result;
}

function resolveMember(record) {
  const matches = membersByUsername.get(normalizeUsername(record.member)) ?? [];
  if (matches.length === 1) return matches[0];
  if (matches.length < 2) return null;
  const adminName = normalizeUsername(record.admin);
  const scopedMatches = matches.filter((member) => normalizeUsername(member.referredBy) === adminName);
  return scopedMatches.length === 1 ? scopedMatches[0] : null;
}

function reservationData(type, matches) {
  const memberIds = matches.map((member) => member.id);
  return {
    type,
    memberId: matches.length === 1 ? memberIds[0] : "",
    memberIds,
    conflict: matches.length > 1,
    updatedAt: new Date().toISOString(),
  };
}

async function commitWrites(collectionName, writes, replace = false) {
  for (let index = 0; index < writes.length; index += 400) {
    const batch = db.batch();
    for (const write of writes.slice(index, index + 400)) {
      batch.set(db.collection(collectionName).doc(write.id), write.data, { merge: !replace });
    }
    await batch.commit();
  }
}
