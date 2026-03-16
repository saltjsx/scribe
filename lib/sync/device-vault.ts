"use client";

import { base64ToBytes, base64ToUtf8, bytesToBase64 } from "@/lib/sync/base64";
import {
  getCachedVaultRecord,
  getDeviceWrapKeyRecord,
  putCachedVaultRecord,
  putDeviceWrapKeyRecord,
} from "@/lib/sync/local-store";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer;
}

function getWebCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable in this environment.");
  }

  return globalThis.crypto;
}

function buildCacheAad(userId: string) {
  return textEncoder.encode(
    JSON.stringify({
      userId,
      scope: "device-vault-cache",
      version: 1,
    })
  );
}

async function getOrCreateDeviceWrapKey(userId: string) {
  const existingRecord = await getDeviceWrapKeyRecord(userId);
  if (existingRecord) {
    return existingRecord.cryptoKey;
  }

  const cryptoKey = await getWebCrypto().subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );

  await putDeviceWrapKeyRecord({
    key: `${userId}:device-wrap-key`,
    userId,
    cryptoKey,
  });

  return cryptoKey;
}

export async function cacheVaultKeyLocally(userId: string, rawVaultKey: string) {
  const crypto = getWebCrypto();
  const wrapKey = await getOrCreateDeviceWrapKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = buildCacheAad(userId);
  const plaintext = textEncoder.encode(rawVaultKey);
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(aad),
    },
    wrapKey,
    toArrayBuffer(plaintext)
  );

  await putCachedVaultRecord({
    key: `${userId}:vault-cache`,
    userId,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  });
}

function isValidVaultKey(candidate: string) {
  try {
    return base64ToBytes(candidate).byteLength === 32;
  } catch {
    return false;
  }
}

async function normalizeCachedVaultKey(userId: string, plaintextBytes: Uint8Array) {
  const decryptedText = textDecoder.decode(plaintextBytes);
  if (isValidVaultKey(decryptedText)) {
    return decryptedText;
  }

  try {
    const legacyDecoded = base64ToUtf8(decryptedText);
    if (isValidVaultKey(legacyDecoded)) {
      await cacheVaultKeyLocally(userId, legacyDecoded);
      return legacyDecoded;
    }
  } catch {
    return null;
  }

  return null;
}

export async function loadCachedVaultKey(userId: string) {
  const cachedRecord = await getCachedVaultRecord(userId);
  const deviceKeyRecord = await getDeviceWrapKeyRecord(userId);

  if (!cachedRecord || !deviceKeyRecord) {
    return null;
  }

  try {
    const plaintext = await getWebCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(base64ToBytes(cachedRecord.iv)),
        additionalData: toArrayBuffer(buildCacheAad(userId)),
      },
      deviceKeyRecord.cryptoKey,
      toArrayBuffer(base64ToBytes(cachedRecord.ciphertext))
    );

    return normalizeCachedVaultKey(userId, new Uint8Array(plaintext));
  } catch {
    return null;
  }
}
