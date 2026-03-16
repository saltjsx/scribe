import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getMasterKeyBytes() {
  const secret = process.env.SYNC_MASTER_KEY;

  if (!secret) {
    throw new Error("SYNC_MASTER_KEY is not set.");
  }

  return createHash("sha256").update(secret).digest();
}

export function generateVaultKey() {
  return randomBytes(32).toString("base64");
}

export function wrapVaultKey(rawVaultKey: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMasterKeyBytes(), iv);
  const ciphertext = Buffer.concat([cipher.update(rawVaultKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function unwrapVaultKey(payload: { ciphertext: string; iv: string; tag: string }) {
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getMasterKeyBytes(),
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
