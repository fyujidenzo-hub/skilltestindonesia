import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import type { Member, Order, Product } from "../types";

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
  const referenceNumber = order.referenceNumber || `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const nextOrder: Order = {
    ...order,
    id,
    referenceNumber,
    memberId: order.memberId ?? "",
    productCode: order.productCode ?? "",
    productName: order.productName ?? "",
    value: order.value ?? 0,
    commission: order.commission ?? 0,
    requiredBalance: order.requiredBalance ?? 0,
    assignedAt: order.assignedAt ?? "",
    completedAt: order.completedAt ?? "",
  };
  await setDoc(doc(db, COLLECTION, id), nextOrder);
  return nextOrder;
}

export async function updateOrder(id: string, data: Partial<Order>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteOrder(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function assignOrderProduct(order: Order, product: Product): Promise<Order> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const nextOrder: Order = {
    ...order,
    productCode: product.code,
    productName: product.name,
    value: product.price,
    commission: product.commission,
    requiredBalance: product.requiredBalance ?? 0,
    status: "assigned",
    assignedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
  };

  await runTransaction(firestore, async (transaction) => {
    const orderRef = doc(firestore, COLLECTION, order.id);
    const productRef = doc(firestore, "products", product.id);
    const productSnap = await transaction.get(productRef);
    const quantity = productSnap.exists() ? Number(productSnap.data().quantity ?? product.quantity) : product.quantity;

    if (quantity <= 0) throw new Error("This product task has no quantity left.");

    transaction.update(productRef, { quantity: quantity - 1 });
    transaction.update(orderRef, {
      productCode: nextOrder.productCode,
      productName: nextOrder.productName,
      value: nextOrder.value,
      commission: nextOrder.commission,
      requiredBalance: nextOrder.requiredBalance,
      status: nextOrder.status,
      assignedAt: nextOrder.assignedAt,
      completedAt: nextOrder.completedAt ?? "",
    });
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
