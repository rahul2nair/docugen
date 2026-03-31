import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const KEY_LENGTH = 32;
const IV_LENGTH = 12;

function getSecretKey() {
  const raw = process.env.SECRETS_ENCRYPTION_KEY?.trim() || "";

  if (!raw) {
    throw new Error("SECRETS_ENCRYPTION_KEY is not set");
  }

  return createHash("sha256").update(raw).digest().subarray(0, KEY_LENGTH);
}

export function encryptSecret(plainText: string) {
  const key = getSecretKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(encryptedValue: string) {
  const payload = Buffer.from(encryptedValue, "base64");

  if (payload.byteLength <= IV_LENGTH + 16) {
    throw new Error("Invalid encrypted payload");
  }

  const key = getSecretKey();
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = payload.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
