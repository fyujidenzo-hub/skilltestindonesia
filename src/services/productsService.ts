import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../types";

const COLLECTION = "products";

function productFromSnapshot(snapshot: { id: string; data: () => Record<string, unknown> }): Product {
  const data = snapshot.data();
  return {
    ...data,
    id: snapshot.id,
    name: String(data.name ?? "").replace(/\uFFFC/g, "").trim(),
  } as Product;
}

export async function getProducts(): Promise<Product[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(productFromSnapshot);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? productFromSnapshot(snapshot) : null;
}

export async function getProductByCode(code: string): Promise<Product | null> {
  if (!db) return null;
  const q = query(collection(db, COLLECTION), where("code", "==", code));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : productFromSnapshot(snapshot.docs[0]);
}

export async function createProduct(product: Omit<Product, "id"> & { id?: string }): Promise<Product> {
  if (!db) throw new Error("Firebase not initialized");
  const id = product.id || crypto.randomUUID();
  await setDoc(doc(db, COLLECTION, id), { ...product, id });
  return { ...product, id } as Product;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
