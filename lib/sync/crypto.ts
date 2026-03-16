import type { Entry } from "@/lib/entries";
import { base64ToBytes, base64ToUtf8, bytesToBase64, utf8ToBase64 } from "@/lib/sync/base64";

export const ENTRY_AAD_VERSION = 1;

const textEncoder = new TextEncoder();

function getWebCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable in this environment.");
  }

  return globalThis.crypto;
}

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer;
}

export function buildEntryAad(userId: string, entryId: string, aadVersion = ENTRY_AAD_VERSION) {
  return textEncoder.encode(
    JSON.stringify({
      userId,
      entryId,
      aadVersion,
    })
  );
}

export async function importVaultKey(rawKeyBase64: string): Promise<CryptoKey> {
  const crypto = getWebCrypto();

  return crypto.subtle.importKey(
    "raw",
    toArrayBuffer(base64ToBytes(rawKeyBase64)),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptEntryPayload(params: {
  vaultKey: CryptoKey;
  userId: string;
  entryId: string;
  payload: Entry;
}) {
  const crypto = getWebCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = buildEntryAad(params.userId, params.entryId);
  const plaintext = textEncoder.encode(JSON.stringify(params.payload));
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aad),
    },
    params.vaultKey,
    toArrayBuffer(plaintext)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
    aadVersion: ENTRY_AAD_VERSION,
  };
}

export async function decryptEntryPayload(params: {
  vaultKey: CryptoKey;
  userId: string;
  entryId: string;
  ciphertext: string;
  iv: string;
  aadVersion?: number;
}): Promise<Entry> {
  const plaintext = await getWebCrypto().subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(base64ToBytes(params.iv)),
      additionalData: toArrayBuffer(
        buildEntryAad(params.userId, params.entryId, params.aadVersion ?? ENTRY_AAD_VERSION)
      ),
    },
    params.vaultKey,
    toArrayBuffer(base64ToBytes(params.ciphertext))
  );

  return JSON.parse(base64ToUtf8(bytesToBase64(new Uint8Array(plaintext)))) as Entry;
}

export function serializeVaultKey(rawKeyBase64: string): string {
  return utf8ToBase64(rawKeyBase64);
}

export function deserializeVaultKey(serializedKey: string): string {
  return base64ToUtf8(serializedKey);
}
