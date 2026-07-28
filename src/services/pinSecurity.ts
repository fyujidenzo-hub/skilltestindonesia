const iterations = 120_000;

export async function hashWithdrawalPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyWithdrawalPin(pin: string, encodedHash: string) {
  const [algorithm, rawIterations, saltBase64, expectedBase64] = encodedHash.split("$");
  if (algorithm !== "pbkdf2" || !rawIterations || !saltBase64 || !expectedBase64) return false;
  const expected = fromBase64(expectedBase64);
  const actual = await derive(pin, fromBase64(saltBase64), Number(rawIterations));
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
  return mismatch === 0;
}

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>, count: number) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: count },
    key,
    256,
  );
  return new Uint8Array(bits);
}

function toBase64(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
