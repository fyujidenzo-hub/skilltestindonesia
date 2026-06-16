import { collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Member } from "../types";

const COLLECTION = "members";

export async function getMembers(): Promise<Member[]> {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Member));
}

export async function getMemberById(id: string): Promise<Member | null> {
  if (!db) return null;
  const snapshot = await getDoc(doc(db, COLLECTION, id));
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Member) : null;
}

export async function getMemberByUsername(username: string): Promise<Member | null> {
  if (!db) return null;
  const q = query(collection(db, COLLECTION), where("username", "==", username));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Member);
}

export async function createMember(member: Omit<Member, "id">): Promise<Member> {
  if (!db) throw new Error("Firebase not initialized");
  const docRef = await addDoc(collection(db, COLLECTION), member);
  return { id: docRef.id, ...member };
}

export async function updateMember(id: string, data: Partial<Member>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function deleteMember(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}
