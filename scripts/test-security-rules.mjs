import { readFile } from "node:fs/promises";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";

const projectId = "demo-skilltest";
const testEnvironment = await initializeTestEnvironment({
  projectId,
  firestore: { rules: await readFile("firestore.rules", "utf8") },
  storage: { rules: await readFile("storage.rules", "utf8") },
});

try {
  await testEnvironment.clearFirestore();
  await testEnvironment.clearStorage();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "authRoles", "member-uid"), { role: "member", subjectId: "member-1" });
    await setDoc(doc(db, "authRoles", "employee-uid"), { role: "employee", subjectId: "admin-2" });
    await setDoc(doc(db, "authRoles", "admin-uid"), { role: "admin", subjectId: "admin-3" });
    await setDoc(doc(db, "authRoles", "super-uid"), { role: "super_admin", subjectId: "admin-1" });
    await setDoc(doc(db, "members", "member-1"), {
      id: "member-1",
      authUid: "member-uid",
      authEmail: "member-1@example.test",
      username: "Marc",
      usernameNormalized: "marc",
      phone: "08123",
      phoneNormalized: "08123",
      invitationCode: "123456",
      referredBy: "Admin",
      referredByAdminId: "admin-1",
      level: "Starter",
      balance: 200000,
      totalOrders: 5,
      lastLogin: "2026-07-27 12:00",
      withdrawalPinHash: "pbkdf2$120000$test$test",
    });
    await setDoc(doc(db, "members", "member-2"), {
      id: "member-2",
      authUid: "other-uid",
      username: "Other",
      balance: 0,
      totalOrders: 0,
    });
    await setDoc(doc(db, "members", "member-3"), {
      id: "member-3",
      authUid: "direct-owner-uid",
      username: "Direct Owner",
      balance: 100000,
      totalOrders: 0,
    });
    await setDoc(doc(db, "products", "product-1"), {
      id: "product-1",
      name: "Test product",
      price: 100000,
    });
    await setDoc(doc(db, "orders", "waiting-order"), {
      id: "waiting-order",
      referenceNumber: "PSN-TEST",
      memberId: "member-1",
      member: "Marc",
      status: "waiting_assignment",
      productCode: "",
      productName: "",
      quantity: 0,
      assignedProducts: [],
      value: 0,
      commission: 0,
      requiredBalance: 0,
    });
  });

  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const memberDb = testEnvironment.authenticatedContext("member-uid").firestore();
  const employeeDb = testEnvironment.authenticatedContext("employee-uid").firestore();
  const adminDb = testEnvironment.authenticatedContext("admin-uid").firestore();
  const superDb = testEnvironment.authenticatedContext("super-uid").firestore();
  const directOwnerDb = testEnvironment.authenticatedContext("direct-owner-uid").firestore();
  const impostorDb = testEnvironment.authenticatedContext("impostor-uid").firestore();

  await assertFails(getDoc(doc(anonymousDb, "members", "member-1")));
  await assertSucceeds(getDoc(doc(anonymousDb, "products", "product-1")));
  await assertSucceeds(getDoc(doc(memberDb, "members", "member-1")));
  await assertFails(getDoc(doc(memberDb, "members", "member-2")));
  await assertSucceeds(getDoc(doc(directOwnerDb, "members", "member-3")));
  await assertSucceeds(updateDoc(doc(employeeDb, "members", "member-1"), { level: "Silver" }));
  await assertSucceeds(updateDoc(doc(memberDb, "members", "member-1"), { favoriteProductIds: ["product-1"] }));
  await assertSucceeds(updateDoc(doc(superDb, "members", "member-1"), {
    withdrawalLocked: true,
    withdrawalRemarks: "Sedang ditinjau",
  }));
  await assertFails(updateDoc(doc(employeeDb, "products", "product-1"), { price: 1 }));
  await assertSucceeds(updateDoc(doc(superDb, "products", "product-1"), { price: 125000 }));
  await assertFails(updateDoc(doc(memberDb, "members", "member-1"), { balance: 999999 }));

  await assertFails(setDoc(doc(memberDb, "orders", "waiting-order-2"), {
    id: "waiting-order-2",
    referenceNumber: "PSN-TEST-2",
    memberId: "member-1",
    member: "Marc",
    status: "waiting_assignment",
    productCode: "",
    productName: "",
    quantity: 0,
    assignedProducts: [],
    value: 0,
    commission: 0,
    requiredBalance: 0,
  }));
  await assertFails(setDoc(doc(memberDb, "orders", "forged-order"), {
    id: "forged-order",
    referenceNumber: "PSN-FORGED",
    memberId: "member-1",
    member: "Marc",
    status: "product_assigned",
    productCode: "P1",
    productName: "Forged",
    quantity: 1,
    assignedProducts: [{ productId: "product-1" }],
    value: 1,
    commission: 1000000,
    requiredBalance: 1,
  }));
  await assertFails(setDoc(doc(directOwnerDb, "orders", "direct-owner-order"), {
    id: "direct-owner-order",
    referenceNumber: "PSN-DIRECT",
    memberId: "member-3",
    member: "Direct Owner",
    status: "waiting_assignment",
    productCode: "",
    productName: "",
    quantity: 0,
    assignedProducts: [],
    value: 0,
    commission: 0,
    requiredBalance: 0,
  }));
  await assertFails(setDoc(doc(impostorDb, "orders", "impostor-order"), {
    id: "impostor-order",
    referenceNumber: "PSN-IMPOSTOR",
    memberId: "member-3",
    member: "Direct Owner",
    status: "waiting_assignment",
    productCode: "",
    productName: "",
    quantity: 0,
    assignedProducts: [],
    value: 0,
    commission: 0,
    requiredBalance: 0,
  }));
  await assertSucceeds(setDoc(doc(memberDb, "transactions", "topup-1"), {
    id: "topup-1",
    memberId: "member-1",
    member: "Marc",
    type: "topup",
    amount: 100012,
    status: "pending",
  }));
  await assertFails(setDoc(doc(memberDb, "transactions", "topup-too-small"), {
    id: "topup-too-small",
    memberId: "member-1",
    member: "Marc",
    type: "topup",
    amount: 99999,
    status: "pending",
  }));
  await assertFails(setDoc(doc(memberDb, "transactions", "topup-too-large"), {
    id: "topup-too-large",
    memberId: "member-1",
    member: "Marc",
    type: "topup",
    amount: 100000001,
    status: "pending",
  }));
  await assertFails(setDoc(doc(memberDb, "transactions", "topup-decimal"), {
    id: "topup-decimal",
    memberId: "member-1",
    member: "Marc",
    type: "topup",
    amount: 100000.5,
    status: "pending",
  }));
  const topupApproval = writeBatch(adminDb);
  topupApproval.update(doc(adminDb, "transactions", "topup-1"), {
    status: "approved",
    creditedAt: "2026-07-27 13:00",
  });
  topupApproval.update(doc(adminDb, "members", "member-1"), {
    balance: 300012,
    lastBalanceTransactionId: "topup-1",
  });
  await assertFails(topupApproval.commit());
  const superTopupApproval = writeBatch(superDb);
  superTopupApproval.update(doc(superDb, "transactions", "topup-1"), {
    status: "approved",
    creditedAt: "2026-07-27 13:00",
  });
  superTopupApproval.update(doc(superDb, "members", "member-1"), {
    balance: 300012,
    lastBalanceTransactionId: "topup-1",
  });
  await assertSucceeds(superTopupApproval.commit());
  await assertFails(setDoc(doc(memberDb, "transactions", "withdrawal-bypass"), {
    id: "withdrawal-bypass",
    memberId: "member-1",
    member: "Marc",
    type: "withdrawal",
    amount: 100000,
    status: "pending",
  }));

  await assertSucceeds(updateDoc(doc(employeeDb, "orders", "waiting-order"), {
    status: "product_assigned",
    productCode: "P1",
    productName: "Assigned product",
    quantity: 1,
    assignedProducts: [{
      productId: "product-1",
      code: "P1",
      name: "Assigned product",
      price: 125000,
      commission: 25000,
      quantity: 1,
      total: 125000,
    }],
    value: 125000,
    commission: 25000,
    requiredBalance: 125000,
    assignedAt: "2026-07-27 13:01",
    assignedByAdminId: "admin-2",
    assignedByName: "Employee",
  }));
  const completion = writeBatch(memberDb);
  completion.update(doc(memberDb, "orders", "waiting-order"), {
    status: "diserahkan",
    completedAt: "2026-07-27 13:02",
    commissionCreditedAt: "2026-07-27 13:02",
  });
  completion.update(doc(memberDb, "members", "member-1"), {
    balance: 325012,
    totalOrders: 6,
    lastCompletedOrderId: "waiting-order",
  });
  await assertSucceeds(completion.commit());

  const memberStorage = testEnvironment.authenticatedContext("member-uid").storage();
  await assertSucceeds(
    uploadBytes(ref(memberStorage, "payment-proofs/member-1/topup-1/proof.png"), new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    }),
  );
  await assertFails(
    uploadBytes(ref(memberStorage, "payment-proofs/member-2/topup-1/proof.png"), new Uint8Array([1, 2, 3]), {
      contentType: "image/png",
    }),
  );
  await assertFails(
    uploadBytes(ref(memberStorage, "payment-proofs/member-1/topup-1/proof.txt"), new Uint8Array([1, 2, 3]), {
      contentType: "text/plain",
    }),
  );

  console.log("Security rules behavior verified.");
} finally {
  await testEnvironment.cleanup();
}
