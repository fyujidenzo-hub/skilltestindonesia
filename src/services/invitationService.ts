import { collection, doc, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../firebase";

export type Invitation = {
  adminId: string;
  adminName: string;
  registrationBonus: number;
  active?: boolean;
};

export async function getInvitation(code: string): Promise<Invitation | null> {
  if (!db) return null;
  const normalizedCode = code.trim();
  if (!/^[A-Za-z0-9_-]{4,32}$/.test(normalizedCode)) return null;

  try {
    const snapshot = await getDoc(doc(db, "invitationCodes", normalizedCode));
    if (snapshot.exists()) {
      const invitation = snapshot.data() as Invitation;
      return invitation.active === false ? null : invitation;
    }
  } catch {
    // The transitional production rules predate invitationCodes.
  }

  for (const field of ["invitationCode", "code", "adminCode"]) {
    try {
      const snapshot = await getDocs(
        query(collection(db, "admins"), where(field, "==", normalizedCode), limit(1)),
      );
      if (!snapshot.empty) {
        const admin = snapshot.docs[0];
        const data = admin.data();
        return {
          adminId: admin.id,
          adminName: data.name || data.username || "Admin",
          registrationBonus: Number(data.registrationBonus ?? 0),
          active: true,
        };
      }
    } catch {
      // Final rules intentionally hide the admins collection from visitors.
    }
  }

  return null;
}
