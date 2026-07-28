import "dotenv/config";
import { createHash } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { loadFirebaseAdminConfig } from "./firebase-admin-config.mjs";

const { projectId, serviceAccount } = await loadFirebaseAdminConfig();
const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount), projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const collectionNames = [
  "members",
  "admins",
  "orders",
  "transactions",
  "authRoles",
  "loginIdentifiers",
];
const snapshots = await Promise.all(collectionNames.map((name) => db.collection(name).get()));
const collections = Object.fromEntries(
  snapshots.map((snapshot, index) => [
    collectionNames[index],
    snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  ]),
);
const authUsers = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  authUsers.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);

const members = collections.members;
const admins = collections.admins;
const orders = collections.orders;
const transactions = collections.transactions;
const roles = collections.authRoles;
const loginIdentifierIds = new Set(collections.loginIdentifiers.map((item) => item.id));
const memberIds = new Set(members.map((item) => item.id));
const adminIds = new Set(admins.map((item) => item.id));
const authUids = new Set(authUsers.map((item) => item.uid));
const completedStatuses = new Set(["completed", "diserahkan"]);
const completedByMember = new Map();
for (const order of orders) {
  if (!completedStatuses.has(String(order.status ?? "").toLowerCase())) continue;
  const memberId = String(order.memberId ?? "");
  completedByMember.set(memberId, (completedByMember.get(memberId) ?? 0) + 1);
}

const roleMismatches = roles.filter((role) => {
  const expected = role.role === "member"
    ? members.find((item) => item.id === role.subjectId)
    : admins.find((item) => item.id === role.subjectId);
  return expected && String(expected.authUid ?? "") !== role.id;
}).length;
const orphanRoles = roles.filter((role) =>
  role.role === "member" ? !memberIds.has(String(role.subjectId)) : !adminIds.has(String(role.subjectId)),
).length;

const report = {
  projectId,
  generatedAt: new Date().toISOString(),
  counts: {
    members: members.length,
    admins: admins.length,
    orders: orders.length,
    transactions: transactions.length,
    authUsers: authUsers.length,
    authRoles: roles.length,
    loginIdentifiers: collections.loginIdentifiers.length,
  },
  credentials: {
    memberDocsWithLegacyPlaintextPassword: members.filter((item) =>
      Boolean(item.accountPassword || item.password || item.withdrawalPassword),
    ).length,
    adminDocsWithLegacyPlaintextPassword: admins.filter((item) => Boolean(item.password)).length,
    membersWithoutAuthUid: members.filter((item) => !item.authUid).length,
    adminsWithoutAuthUid: admins.filter((item) => !item.authUid).length,
    linkedAccountsMissingFirebaseAuth: [...members, ...admins].filter(
      (item) => item.authUid && !authUids.has(String(item.authUid)),
    ).length,
    roleMismatches,
    orphanRoleDocuments: orphanRoles,
  },
  identity: {
    duplicateMemberUsernameGroups: duplicateCount(members, (item) => normalizeUsername(item.username)),
    duplicateMemberPhoneGroups: duplicateCount(members, (item) => normalizePhone(item.phone)),
    duplicateAdminUsernameGroups: duplicateCount(admins, (item) => normalizeUsername(item.username)),
    membersMissingUsernameLoginMap: members.filter((item) => {
      const value = normalizeUsername(item.username);
      return value && !loginIdentifierIds.has(keyFor("memberUsername", value));
    }).length,
    membersMissingPhoneLoginMap: members.filter((item) => {
      const value = normalizePhone(item.phone);
      return value && !loginIdentifierIds.has(keyFor("memberPhone", value));
    }).length,
    adminsMissingUsernameLoginMap: admins.filter((item) => {
      const value = normalizeUsername(item.username);
      return value && !loginIdentifierIds.has(keyFor("adminUsername", value));
    }).length,
  },
  ownership: {
    ordersMissingValidMemberId: orders.filter((item) => !memberIds.has(String(item.memberId ?? ""))).length,
    transactionsMissingValidMemberId: transactions.filter(
      (item) => !memberIds.has(String(item.memberId ?? "")),
    ).length,
    membersWithStoredTotalBelowCompletedOrders: members.filter(
      (item) => Number(item.totalOrders ?? 0) < (completedByMember.get(item.id) ?? 0),
    ).length,
  },
};

console.log(JSON.stringify(report, null, 2));

function normalizeUsername(value) {
  return String(value ?? "").trim().toLocaleLowerCase("id-ID");
}

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function keyFor(type, value) {
  return createHash("sha256").update(`${type}:${value}`).digest("hex");
}

function duplicateCount(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}
