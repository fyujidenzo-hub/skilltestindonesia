import assert from "node:assert/strict";
import { test } from "node:test";
import { startEventWatchers } from "../push-notifications.js";

function fakeFirestore() {
  const listeners = new Map();
  const claims = new Set();
  const member = { authUid: "customer-uid", username: "Private Customer", referredByAdminId: "admin-1" };
  const devices = new Map([
    ["customer-uid", [{ token: "customer-device-token" }]],
    ["admin-uid", [{ token: "admin-device-token" }]],
    ["super-uid", [{ token: "super-device-token" }]],
  ]);
  const snapshot = (id, data) => ({ id, exists: Boolean(data), data: () => data });
  const firestore = {
    collection(name) {
      return {
        onSnapshot(callback) { listeners.set(name, callback); return () => listeners.delete(name); },
        where(field, operator, value) {
          assert.equal(field, name === "admins" ? "role" : "uid");
          assert.equal(operator, "==");
          return { async get() {
            if (name === "admins") return { docs: [snapshot("admin-super", { authUid: "super-uid" })] };
            return {
              empty: !devices.get(value)?.length,
              docs: (devices.get(value) || []).map((data) => ({ data: () => data, ref: { async delete() {} } })),
            };
          } };
        },
        doc(id) {
          return {
            async get() {
              if (name === "members") return snapshot(id, id === "member-1" ? member : null);
              if (name === "admins") return snapshot(id, id === "admin-1" ? { authUid: "admin-uid" } : null);
              return snapshot(id, null);
            },
            async create() {
              if (claims.has(id)) throw { code: 6 };
              claims.add(id);
            },
          };
        },
      };
    },
  };
  return { firestore, listeners, claims };
}

function emit(listener, type, id, data) {
  listener({ docChanges: () => [{ type, doc: { id, data: () => data } }] });
}

async function waitFor(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for the push event");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("order changes send only generic alerts to the intended devices", async () => {
  const { firestore, listeners } = fakeFirestore();
  const sent = [];
  const messaging = {
    async sendEachForMulticast(message) {
      sent.push(message);
      return { responses: message.tokens.map(() => ({ success: true })) };
    },
  };
  startEventWatchers(firestore, messaging);
  const orderListener = listeners.get("orders");
  assert.equal(typeof orderListener, "function");
  const old = { memberId: "member-1", status: "waiting_assignment", assignedAt: "", createdAt: "2020-01-01 00:00", referenceNumber: "PRIVATE-ORDER", value: 900000 };
  emit(orderListener, "added", "order-1", old);
  emit(orderListener, "modified", "order-1", { ...old, status: "product_assigned", assignedAt: "2026-10-28 00:00" });
  await waitFor(() => sent.length === 1);
  assert.deepEqual(sent[0].tokens, ["customer-device-token"]);
  assert.equal(sent[0].data.path, "/");
  assert.equal(sent[0].data.title, "Tokopedia");
  assert.equal(JSON.stringify(sent[0]).includes("PRIVATE-ORDER"), false);
  assert.equal(JSON.stringify(sent[0]).includes("900000"), false);
  assert.equal(JSON.stringify(sent[0]).includes("Private Customer"), false);

  emit(orderListener, "modified", "order-1", { ...old, status: "completed", assignedAt: "2026-10-28 00:00", completedAt: "2026-10-28 00:05" });
  await waitFor(() => sent.length === 4);
  assert.deepEqual(new Set(sent.slice(1).flatMap((message) => message.tokens)), new Set(["customer-device-token", "admin-device-token", "super-device-token"]));
  assert(sent.slice(1).every((message) => message.data.body === "Anda memiliki notifikasi baru. Buka aplikasi untuk melihatnya."));
});
