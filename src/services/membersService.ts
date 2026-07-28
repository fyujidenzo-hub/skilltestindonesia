import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, deleteField, query, where, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import type { Member } from "../types";
import { identityKey } from "./identityKey";
import { normalizePhone, normalizeUsername } from "./memberOwnership";

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
  const normalized = normalizeUsername(username);
  const q = query(collection(db, COLLECTION), where("usernameNormalized", "==", normalized));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Member;

  const legacySnapshot = await getDocs(query(collection(db, COLLECTION), where("username", "==", username)));
  return legacySnapshot.empty ? null : ({ id: legacySnapshot.docs[0].id, ...legacySnapshot.docs[0].data() } as Member);
}

export async function getMemberByEmail(email: string): Promise<Member | null> {
  if (!db) return null;
  const q = query(collection(db, COLLECTION), where("email", "==", email));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Member);
}

export async function getMemberByPhone(phone: string): Promise<Member | null> {
  if (!db) return null;
  const normalized = normalizePhone(phone);
  const q = query(collection(db, COLLECTION), where("phoneNormalized", "==", normalized));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Member;

  const legacySnapshot = await getDocs(query(collection(db, COLLECTION), where("phone", "==", phone)));
  return legacySnapshot.empty ? null : ({ id: legacySnapshot.docs[0].id, ...legacySnapshot.docs[0].data() } as Member);
}

export async function updateMember(id: string, data: Partial<Member>): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function updateMemberWithdrawalPin(id: string, withdrawalPinHash: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await updateDoc(doc(db, COLLECTION, id), {
    withdrawalPinHash,
    withdrawalPassword: deleteField(),
  });
}

export async function updateMemberProfile(
  member: Member,
  changes: Pick<Member, "username" | "phone" | "level"> & Partial<Pick<Member, "withdrawalLocked" | "withdrawalRemarks">>,
): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  const firestore = db;
  const usernameNormalized = normalizeUsername(changes.username);
  const phoneNormalized = normalizePhone(changes.phone);
  const oldUsernameNormalized = member.usernameNormalized || normalizeUsername(member.username);
  const oldPhoneNormalized = member.phoneNormalized || normalizePhone(member.phone);
  const [newUsernameReservationId, newPhoneReservationId, oldUsernameReservationId, oldPhoneReservationId, newUsernameLoginId, newPhoneLoginId, oldUsernameLoginId, oldPhoneLoginId] =
    await Promise.all([
      identityKey("username", usernameNormalized),
      identityKey("phone", phoneNormalized),
      identityKey("username", oldUsernameNormalized),
      identityKey("phone", oldPhoneNormalized),
      identityKey("memberUsername", usernameNormalized),
      identityKey("memberPhone", phoneNormalized),
      identityKey("memberUsername", oldUsernameNormalized),
      identityKey("memberPhone", oldPhoneNormalized),
    ]);

  await runTransaction(firestore, async (transaction) => {
    const memberRef = doc(firestore, COLLECTION, member.id);
    const newUsernameReservationRef = doc(firestore, "identityReservations", newUsernameReservationId);
    const newPhoneReservationRef = doc(firestore, "identityReservations", newPhoneReservationId);
    const oldUsernameReservationRef = doc(firestore, "identityReservations", oldUsernameReservationId);
    const oldPhoneReservationRef = doc(firestore, "identityReservations", oldPhoneReservationId);
    const newUsernameLoginRef = doc(firestore, "loginIdentifiers", newUsernameLoginId);
    const newPhoneLoginRef = doc(firestore, "loginIdentifiers", newPhoneLoginId);
    const oldUsernameLoginRef = doc(firestore, "loginIdentifiers", oldUsernameLoginId);
    const oldPhoneLoginRef = doc(firestore, "loginIdentifiers", oldPhoneLoginId);
    const refs = [
      newUsernameReservationRef,
      newPhoneReservationRef,
      oldUsernameReservationRef,
      oldPhoneReservationRef,
      newUsernameLoginRef,
      newPhoneLoginRef,
      oldUsernameLoginRef,
      oldPhoneLoginRef,
    ];
    const snapshots = await Promise.all(refs.map((reference) => transaction.get(reference)));
    const [newUsernameReservation, newPhoneReservation, oldUsernameReservation, oldPhoneReservation, newUsernameLogin, newPhoneLogin, oldUsernameLogin, oldPhoneLogin] = snapshots;

    if (usernameNormalized !== oldUsernameNormalized && newUsernameReservation.exists()) throw new Error("Nama pengguna sudah digunakan.");
    if (phoneNormalized !== oldPhoneNormalized && newPhoneReservation.exists()) throw new Error("Nomor telepon sudah digunakan.");

    transaction.update(memberRef, { ...changes, usernameNormalized, phoneNormalized });
    const now = new Date().toISOString();
    const loginIdentity = {
      scope: "member",
      subjectId: member.id,
      authEmail: member.authEmail ?? "",
      authUid: member.authUid ?? "",
      conflict: false,
      updatedAt: now,
    };
    if (usernameNormalized !== oldUsernameNormalized) {
      transaction.set(newUsernameReservationRef, { type: "username", memberId: member.id, createdAt: now });
      transaction.set(newUsernameLoginRef, loginIdentity);
      if (oldUsernameReservation.data()?.memberId === member.id && !oldUsernameReservation.data()?.conflict) transaction.delete(oldUsernameReservationRef);
      if (oldUsernameLogin.data()?.subjectId === member.id && !oldUsernameLogin.data()?.conflict) transaction.delete(oldUsernameLoginRef);
    }
    if (phoneNormalized !== oldPhoneNormalized) {
      transaction.set(newPhoneReservationRef, { type: "phone", memberId: member.id, createdAt: now });
      transaction.set(newPhoneLoginRef, loginIdentity);
      if (oldPhoneReservation.data()?.memberId === member.id && !oldPhoneReservation.data()?.conflict) transaction.delete(oldPhoneReservationRef);
      if (oldPhoneLogin.data()?.subjectId === member.id && !oldPhoneLogin.data()?.conflict) transaction.delete(oldPhoneLoginRef);
    }
  });
}

export async function deleteMember(id: string): Promise<void> {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, COLLECTION, id));
}

export function subscribeToMember(id: string, onMember: (member: Member | null) => void, onError?: (error: Error) => void) {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, COLLECTION, id),
    (snapshot) => onMember(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Member) : null),
    (error) => onError?.(error),
  );
}
