import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction, limit } from "firebase/firestore";
import { db } from "../firebase";
import type { AssignedOrderProduct, Member, Order, OrderStatus, Product } from "../types";
import { formatRupiah } from "../utils";
import { generateOrderCode } from "./orderCode";

const COLLECTION = "orders";

export async function getOrders(): Promise<Order[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Order) : null;
}

export async function getOrdersByMember(memberUsername: string): Promise<Order[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("member", "==", memberUsername));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
}

export async function getOrdersByStatus(status: Order["status"]): Promise<Order[]> {
  if (!db) return [];
  const q = query(collection(db, COLLECTION), where("status", "==", status));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Order));
}

export async function createOrder(order: Omit<Order, "id"> & { id?: string }): Promise<Order> {
  if (!db) throw new Error("Firebase not initialized");
  const id = order.id || crypto.randomUUID();
  const referenceNumber = order.referenceNumber || await createUniqueOrderCode();
  const nextOrder: Order = {
    ...order,
    id,
    referenceNumber,
    memberId: order.memberId ?? "",
    productCode: order.productCode ?? "",
    productName: order.productName ?? "",
    quantity: order.quantity ?? 0,
    assignedProducts: order.assignedProducts ?? [],
    value: order.value ?? 0,
    commission: order.commission ?? 0,
    requiredBalance: order.requiredBalance ?? 0,
    assignedAt: order.assignedAt ?? "",
    completedAt: order.completedAt ?? "",
    submittedAt: order.submittedAt ?? "",
    shippedAt: order.shippedAt ?? "",
  };
  await setDoc(doc(db, COLLECTION, id), nextOrder);
  return nextOrder;
}

async function createUniqueOrderCode(): Promise<string> {
  if (!db) return generateOrderCode();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const referenceNumber = generateOrderCode();
    const existing = await getDocs(query(collection(db, COLLECTION), where("referenceNumber", "==", referenceNumber), limit(1)));
    if (existing.empty) return referenceNumber;
  }

  throw new Error("Unable to generate a unique order code. Please try again.");
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteOrder(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function assignOrderProduct(order: Order, product: Product, options: { requiresCustomerApproval?: boolean } = {}): Promise<Order> {
  return assignOrderProducts(order, [{ product, quantity: 1 }], options);
}

export async function assignOrderProducts(order: Order, items: Array<{ product: Product; quantity: number }>, options: { requiresCustomerApproval?: boolean } = {}): Promise<Order> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const normalizedItems = items
    .map((item) => ({ product: item.product, quantity: Math.max(1, Math.floor(item.quantity || 1)) }))
    .filter((item) => item.quantity > 0);

  if (!normalizedItems.length) throw new Error("Select at least one product.");

  const assignedProducts: AssignedOrderProduct[] = normalizedItems.map(({ product, quantity }) => ({
    productId: product.id,
    code: product.code,
    name: product.name,
    price: product.price,
    commission: product.commission,
    quantity,
    total: product.price * quantity,
  }));
  const primaryProduct = assignedProducts[0];
  const requiredBalance = assignedProducts.reduce((sum, product) => sum + product.total, 0);
  const totalCommission = assignedProducts.reduce((sum, product) => sum + product.commission * product.quantity, 0);
  const nextOrder: Order = {
    ...order,
    productCode: primaryProduct.code,
    productName: primaryProduct.name,
    quantity: assignedProducts.reduce((sum, product) => sum + product.quantity, 0),
    assignedProducts,
    value: requiredBalance,
    commission: totalCommission,
    requiredBalance,
    status: "product_assigned",
    assignedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
    requiresCustomerApproval: options.requiresCustomerApproval ?? false,
    adminChangedAt: options.requiresCustomerApproval ? new Date().toISOString().slice(0, 16).replace("T", " ") : order.adminChangedAt ?? "",
  };

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, COLLECTION, order.id);
    const productRefs = normalizedItems.map(({ product }) => doc(firestore, "products", product.id));
    const productSnaps = await Promise.all(productRefs.map((productRef) => transaction.get(productRef)));

    productSnaps.forEach((productSnap, index) => {
      const requestedQuantity = normalizedItems[index].quantity;
      const fallbackQuantity = normalizedItems[index].product.quantity;
      const availableQuantity = productSnap.exists() ? Number(productSnap.data().quantity ?? fallbackQuantity) : fallbackQuantity;

      if (availableQuantity < requestedQuantity) {
        throw new Error(`${normalizedItems[index].product.name} does not have enough quantity left.`);
      }
    });

    productRefs.forEach((productRef, index) => {
      const productSnap = productSnaps[index];
      const requestedQuantity = normalizedItems[index].quantity;
      const fallbackQuantity = normalizedItems[index].product.quantity;
      const availableQuantity = productSnap.exists() ? Number(productSnap.data().quantity ?? fallbackQuantity) : fallbackQuantity;
      transaction.update(productRef, { quantity: availableQuantity - requestedQuantity, requiredBalance: normalizedItems[index].product.requiredBalance ?? 0 });
    });

    transaction.update(orderRef, {
      productCode: nextOrder.productCode,
      productName: nextOrder.productName,
      quantity: nextOrder.quantity,
      assignedProducts: nextOrder.assignedProducts,
      value: nextOrder.value,
      commission: nextOrder.commission,
      requiredBalance: nextOrder.requiredBalance,
      status: nextOrder.status,
      assignedAt: nextOrder.assignedAt,
      requiresCustomerApproval: nextOrder.requiresCustomerApproval ?? false,
      adminChangedAt: nextOrder.adminChangedAt ?? "",
      completedAt: nextOrder.completedAt ?? "",
      submittedAt: nextOrder.submittedAt ?? "",
      shippedAt: nextOrder.shippedAt ?? "",
    });
  });

  return nextOrder;
}

export async function updateOrderStatus(order: Order, status: OrderStatus, extra: Partial<Order> = {}): Promise<Order> {
  if (!db) throw new Error("Firebase not initialized");
  const nextOrder: Order = { ...order, ...extra, status };
  await updateDoc(doc(db, COLLECTION, order.id), {
    quantity: nextOrder.quantity ?? 0,
    assignedProducts: nextOrder.assignedProducts ?? [],
    submittedAt: nextOrder.submittedAt ?? "",
    shippedAt: nextOrder.shippedAt ?? "",
    assignedAt: nextOrder.assignedAt ?? "",
    completedAt: nextOrder.completedAt ?? "",
    ...extra,
    status,
  });
  return nextOrder;
}

export async function completeOrderTask(order: Order, member: Member): Promise<{ order: Order; member: Member }> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const completedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  const nextBalance = member.balance + order.commission;
  const nextOrder: Order = { ...order, status: "completed", completedAt };
  const nextMember: Member = { ...member, balance: nextBalance };

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, COLLECTION, order.id);
    const memberRef = doc(firestore, "members", member.id);
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) throw new Error("Order no longer exists.");
    if (orderSnap.data().status !== "assigned") throw new Error("This task has already been submitted.");

    transaction.update(orderRef, { status: "completed", completedAt });
    transaction.update(memberRef, { balance: nextBalance, totalOrders: member.totalOrders + 1 });
  });

  return { order: nextOrder, member: { ...nextMember, totalOrders: member.totalOrders + 1 } };
}

export async function submitWorkflowOrder(order: Order, member: Member): Promise<{ order: Order; member: Member }> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const submittedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  let nextOrder: Order = { ...order, status: "belum_diserahkan", submittedAt };
  let nextMember: Member = { ...member };

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, COLLECTION, order.id);
    const memberRef = doc(firestore, "members", member.id);
    const [orderSnap, memberSnap] = await Promise.all([transaction.get(orderRef), transaction.get(memberRef)]);

    if (!orderSnap.exists()) throw new Error("Order no longer exists.");
    if (!memberSnap.exists()) throw new Error("Member no longer exists.");

    const liveOrder = { id: orderSnap.id, ...orderSnap.data() } as Order;
    const liveMember = { id: memberSnap.id, ...memberSnap.data() } as Member;

    if (liveOrder.status === "belum_diserahkan" || liveOrder.status === "diserahkan" || liveOrder.status === "completed") {
      throw new Error("This task has already been submitted.");
    }

    const requiredBalance = Number(liveOrder.requiredBalance ?? liveOrder.value ?? 0);
    const currentBalance = Number(liveMember.balance ?? 0);
    const shortage = Math.max(0, requiredBalance - currentBalance);
    if (shortage > 0) {
      throw new Error(`Sorry, your balance is insufficient by ${formatRupiah(shortage)}. Please top up first.`);
    }

    nextOrder = {
      ...liveOrder,
      status: "belum_diserahkan",
      submittedAt: order.submittedAt ?? liveOrder.submittedAt ?? submittedAt,
      shippedAt: order.shippedAt ?? liveOrder.shippedAt ?? "",
      quantity: liveOrder.quantity ?? 0,
      assignedProducts: liveOrder.assignedProducts ?? [],
    };
    nextMember = {
      ...liveMember,
      balance: currentBalance - requiredBalance,
    };

    transaction.update(orderRef, {
      status: "belum_diserahkan",
      submittedAt: nextOrder.submittedAt,
      shippedAt: nextOrder.shippedAt ?? "",
      quantity: nextOrder.quantity ?? 0,
      assignedProducts: nextOrder.assignedProducts ?? [],
    });
    transaction.update(memberRef, { balance: nextMember.balance });
  });

  return { order: nextOrder, member: nextMember };
}

export async function completeWorkflowOrder(order: Order, member: Member): Promise<{ order: Order; member: Member }> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const completedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  let nextOrder: Order = { ...order, status: "diserahkan", completedAt };
  let nextMember: Member = { ...member };

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, COLLECTION, order.id);
    const memberRef = doc(firestore, "members", member.id);
    const [orderSnap, memberSnap] = await Promise.all([transaction.get(orderRef), transaction.get(memberRef)]);

    if (!orderSnap.exists()) throw new Error("Order no longer exists.");
    if (!memberSnap.exists()) throw new Error("Member no longer exists.");

    const liveOrder = { id: orderSnap.id, ...orderSnap.data() } as Order;
    const liveMember = { id: memberSnap.id, ...memberSnap.data() } as Member;
    if (liveOrder.status === "diserahkan" || liveOrder.status === "completed") {
      throw new Error("This task has already been completed.");
    }

    const requiredBalance = Number(liveOrder.requiredBalance ?? liveOrder.value ?? 0);
    const currentBalance = Number(liveMember.balance ?? 0);
    const balanceAlreadyDeducted = liveOrder.status === "belum_diserahkan";
    const amountToDeduct = balanceAlreadyDeducted ? 0 : requiredBalance;
    const shortage = Math.max(0, amountToDeduct - currentBalance);
    if (shortage > 0) {
      throw new Error(`Sorry, your balance is insufficient by ${formatRupiah(shortage)}. Please top up first.`);
    }

    const nextBalance = currentBalance - amountToDeduct + Number(liveOrder.commission ?? 0);
    nextOrder = {
      ...liveOrder,
      status: "diserahkan",
      completedAt,
      submittedAt: order.submittedAt ?? liveOrder.submittedAt ?? "",
      shippedAt: order.shippedAt ?? liveOrder.shippedAt ?? "",
      quantity: liveOrder.quantity ?? 0,
      assignedProducts: liveOrder.assignedProducts ?? [],
    };
    nextMember = {
      ...liveMember,
      balance: nextBalance,
      totalOrders: Number(liveMember.totalOrders ?? 0) + 1,
    };

    transaction.update(orderRef, {
      status: "diserahkan",
      completedAt,
      submittedAt: nextOrder.submittedAt ?? "",
      shippedAt: nextOrder.shippedAt ?? "",
      quantity: nextOrder.quantity ?? 0,
      assignedProducts: nextOrder.assignedProducts ?? [],
    });
    transaction.update(memberRef, { balance: nextMember.balance, totalOrders: nextMember.totalOrders });
  });

  return { order: nextOrder, member: nextMember };
}
