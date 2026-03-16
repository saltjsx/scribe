import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "@/lib/sync/base64";
import { decryptEntryPayload, encryptEntryPayload, importVaultKey } from "@/lib/sync/crypto";

async function createVaultKey() {
  return importVaultKey(bytesToBase64(globalThis.crypto.getRandomValues(new Uint8Array(32))));
}

const entry = {
  id: "entry-1",
  date: "Monday, March 16, 2026",
  dateShort: "Mar 16, 2026",
  mood: 7,
  title: "Monday, March 16, 2026",
  body: "<p>Hello</p>",
  tags: [],
};

describe("sync crypto helpers", () => {
  it("round-trips encrypted entries", async () => {
    const vaultKey = await createVaultKey();
    const encrypted = await encryptEntryPayload({
      vaultKey,
      userId: "user-1",
      entryId: entry.id,
      payload: entry,
    });

    await expect(
      decryptEntryPayload({
        vaultKey,
        userId: "user-1",
        entryId: entry.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
    ).resolves.toEqual(entry);
  });

  it("uses a fresh IV for each encryption", async () => {
    const vaultKey = await createVaultKey();
    const first = await encryptEntryPayload({
      vaultKey,
      userId: "user-1",
      entryId: entry.id,
      payload: entry,
    });
    const second = await encryptEntryPayload({
      vaultKey,
      userId: "user-1",
      entryId: entry.id,
      payload: entry,
    });

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it("fails with the wrong key", async () => {
    const firstKey = await createVaultKey();
    const secondKey = await createVaultKey();
    const encrypted = await encryptEntryPayload({
      vaultKey: firstKey,
      userId: "user-1",
      entryId: entry.id,
      payload: entry,
    });

    await expect(
      decryptEntryPayload({
        vaultKey: secondKey,
        userId: "user-1",
        entryId: entry.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
    ).rejects.toThrow();
  });

  it("fails when authenticated data changes", async () => {
    const vaultKey = await createVaultKey();
    const encrypted = await encryptEntryPayload({
      vaultKey,
      userId: "user-1",
      entryId: entry.id,
      payload: entry,
    });

    await expect(
      decryptEntryPayload({
        vaultKey,
        userId: "user-2",
        entryId: entry.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
      })
    ).rejects.toThrow();
  });
});
