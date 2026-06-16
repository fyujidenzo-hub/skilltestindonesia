import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Product } from "../types";

const COLLECTION = "products";

export async function getProducts(): Promise<Product[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Product));
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Product) : null;
}

export async function getProductByCode(code: string): Promise<Product | null> {
  if (!db) return null;
  const q = query(collection(db, COLLECTION), where("code", "==", code));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Product);
}

export async function createProduct(product: Omit<Product, "id">): Promise<Product> {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = await addDoc(collection(db, COLLECTION), product);
  return { id: docRef.id, ...product };
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
