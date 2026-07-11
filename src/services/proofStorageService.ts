import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase";

export const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;

export type UploadedPaymentProof = {
  proofUrl: string;
  proofPath: string;
  proofSize: number;
};

export function validatePaymentProofFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Unggah bukti gambar yang valid.";
  }

  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    return "Ukuran bukti gambar maksimum 5 MB.";
  }

  return "";
}

export async function uploadPaymentProof(file: File, transactionId: string): Promise<UploadedPaymentProof> {
  if (!storage) throw new Error("Firebase Storage is not initialized.");

  const extension = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  const proofPath = `payment-proofs/${transactionId}/${Date.now()}.${extension}`;
  const proofRef = ref(storage, proofPath);

  await uploadBytes(proofRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
    },
  });

  return {
    proofUrl: await getDownloadURL(proofRef),
    proofPath,
    proofSize: file.size,
  };
}
