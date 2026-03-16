"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Entry, StoredEntry, SyncStatus } from "./entries";
import { createEntryId, formatEntryDates } from "./entries";
import {
  bootstrapVault,
  fetchVaultSession,
  loadStoredEntries,
  queueLocalMutation,
  syncUserEntries,
} from "@/lib/sync/client";
import { importVaultKey } from "@/lib/sync/crypto";
import { cacheVaultKeyLocally, loadCachedVaultKey } from "@/lib/sync/device-vault";
import { getDeviceId } from "@/lib/sync/local-store";
import { createRandomId } from "@/lib/sync/random";

interface EntriesContextValue {
  entries: StoredEntry[];
  isHydrated: boolean;
  syncStatus: SyncStatus;
  syncMessage: string | null;
  addEntry: (mood: number, bodyHtml: string) => Promise<void>;
  updateEntry: (id: string, mood: number, bodyHtml: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  syncNow: () => Promise<void>;
}

const EntriesContext = createContext<EntriesContextValue>({
  entries: [],
  isHydrated: false,
  syncStatus: "loading",
  syncMessage: null,
  addEntry: async () => {},
  updateEntry: async () => {},
  deleteEntry: async () => {},
  syncNow: async () => {},
});

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, userId } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const vaultKeyRef = useRef<CryptoKey | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const syncInFlightRef = useRef(false);
  const syncNowRef = useRef<(() => Promise<void>) | null>(null);
  const hydrateEntriesRef = useRef<(() => Promise<void>) | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const entriesRef = useRef(entries);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const clearScheduledRetry = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const scheduleSyncRetry = useCallback((message: string) => {
    if (!userId || !navigator.onLine) {
      return;
    }

    clearScheduledRetry();
    retryAttemptRef.current += 1;

    const delayMs = Math.min(2000 * 2 ** (retryAttemptRef.current - 1), 60000);
    const delaySeconds = Math.ceil(delayMs / 1000);

    setSyncStatus("error");
    setSyncMessage(`${message}. Retrying automatically in ${delaySeconds}s.`);

    retryTimeoutRef.current = window.setTimeout(() => {
      if (vaultKeyRef.current) {
        void syncNowRef.current?.();
        return;
      }

      void hydrateEntriesRef.current?.();
    }, delayMs);
  }, [clearScheduledRetry, userId]);

  const getSessionToken = useCallback(async () => {
    const token = await getToken();
    return token ?? null;
  }, [getToken]);

  const syncNow = useCallback(async () => {
    if (!userId || !vaultKeyRef.current || syncInFlightRef.current) {
      return;
    }

    if (!navigator.onLine) {
      clearScheduledRetry();
      retryAttemptRef.current = 0;
      setSyncStatus("saved-local");
      setSyncMessage("Saved locally. Waiting for connection.");
      return;
    }

    const sessionToken = await getSessionToken();
    if (!sessionToken) {
      scheduleSyncRetry("Waiting for sign-in to finish");
      return;
    }

    clearScheduledRetry();
    syncInFlightRef.current = true;
    setSyncStatus("syncing");
    setSyncMessage("Syncing with Neon...");

    try {
      const nextEntries = await syncUserEntries(userId, vaultKeyRef.current, sessionToken);
      setEntries(nextEntries);
      retryAttemptRef.current = 0;
      setSyncStatus("saved-local");
      setSyncMessage("Saved locally and synced.");
    } catch (error) {
      scheduleSyncRetry(getErrorMessage(error));
    } finally {
      syncInFlightRef.current = false;
    }
  }, [clearScheduledRetry, getSessionToken, scheduleSyncRetry, userId]);

  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

  useEffect(() => {
    return () => {
      clearScheduledRetry();
    };
  }, [clearScheduledRetry]);

  const unlockVaultFromServer = useCallback(async () => {
    if (!userId) {
      return null;
    }

    const sessionToken = await getSessionToken();
    if (!sessionToken) {
      throw new Error("Waiting for sign-in to finish");
    }

    await bootstrapVault(sessionToken);
    const session = await fetchVaultSession(sessionToken);
    await cacheVaultKeyLocally(userId, session.rawKey);

    const vaultKey = await importVaultKey(session.rawKey);
    vaultKeyRef.current = vaultKey;
    return vaultKey;
  }, [getSessionToken, userId]);

  const hydrateEntries = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsHydrated(false);
    setSyncStatus("loading");
    setSyncMessage("Opening local vault...");
    deviceIdRef.current = getDeviceId();

    try {
      const cachedRawVaultKey = await loadCachedVaultKey(userId);

      if (cachedRawVaultKey) {
        const vaultKey = await importVaultKey(cachedRawVaultKey);
        vaultKeyRef.current = vaultKey;

        const nextEntries = await loadStoredEntries(userId, vaultKey);
        setEntries(nextEntries);
        setIsHydrated(true);
        setSyncStatus("saved-local");
        setSyncMessage(nextEntries.length > 0 ? "Opened from local storage." : "Ready for your first entry.");
        void syncNow();
        return;
      }

      if (!navigator.onLine) {
        setEntries([]);
        setIsHydrated(true);
        setSyncStatus("error");
        setSyncMessage("This device needs one online unlock before it can open offline.");
        return;
      }

      setSyncMessage("Setting up secure offline access...");
      const vaultKey = await unlockVaultFromServer();
      if (!vaultKey) {
        throw new Error("Unable to unlock your vault.");
      }

      const nextEntries = await loadStoredEntries(userId, vaultKey);
      setEntries(nextEntries);
      setIsHydrated(true);
      setSyncStatus("saved-local");
      setSyncMessage(nextEntries.length > 0 ? "Offline access is ready." : "Ready for your first entry.");

      void syncNow();
    } catch (error) {
      setEntries([]);
      setIsHydrated(true);
      scheduleSyncRetry(getErrorMessage(error));
    }
  }, [scheduleSyncRetry, syncNow, unlockVaultFromServer, userId]);

  useEffect(() => {
    hydrateEntriesRef.current = hydrateEntries;
  }, [hydrateEntries]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!userId) {
      clearScheduledRetry();
      retryAttemptRef.current = 0;
      vaultKeyRef.current = null;
      deviceIdRef.current = null;
      setEntries([]);
      setIsHydrated(false);
      setSyncStatus("loading");
      setSyncMessage(null);
      return;
    }

    void hydrateEntries();
  }, [clearScheduledRetry, hydrateEntries, isLoaded, userId]);

  useEffect(() => {
    if (!isHydrated || !userId) {
      return;
    }

    const handleOnline = () => {
      if (vaultKeyRef.current) {
        void syncNow();
        return;
      }

      void hydrateEntries();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncNow();
      }
    };

    const intervalId = window.setInterval(() => {
      void syncNow();
    }, 30000);

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hydrateEntries, isHydrated, syncNow, userId]);

  const addEntry = useCallback(async (mood: number, bodyHtml: string) => {
    if (!userId || !vaultKeyRef.current || !deviceIdRef.current) {
      return;
    }

    const now = new Date();
    const entryId = createEntryId(now);
    const updatedAt = now.toISOString();
    const newEntry: Entry = {
      id: entryId,
      mood,
      body: bodyHtml,
      tags: [],
      ...formatEntryDates(now),
    };

    await queueLocalMutation({
      userId,
      entry: newEntry,
      vaultKey: vaultKeyRef.current,
      deviceId: deviceIdRef.current,
      updatedAt,
      deletedAt: null,
      mutationId: createRandomId(),
      operation: "upsert",
    });

    setEntries(await loadStoredEntries(userId, vaultKeyRef.current));
    setSyncStatus("saved-local");
    setSyncMessage("Saved locally.");
    router.push(`/app/entry/${entryId}`);
    void syncNow();
  }, [router, syncNow, userId]);

  const updateEntry = useCallback(async (id: string, mood: number, bodyHtml: string) => {
    if (!userId || !vaultKeyRef.current || !deviceIdRef.current) {
      return;
    }

    const existingEntry = entriesRef.current.find((entry) => entry.id === id);
    if (!existingEntry) {
      return;
    }

    await queueLocalMutation({
      userId,
      entry: {
        ...existingEntry,
        mood,
        body: bodyHtml,
      },
      vaultKey: vaultKeyRef.current,
      deviceId: deviceIdRef.current,
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      mutationId: createRandomId(),
      operation: "upsert",
    });

    setEntries(await loadStoredEntries(userId, vaultKeyRef.current));
    setSyncStatus("saved-local");
    setSyncMessage("Saved locally.");
    void syncNow();
  }, [syncNow, userId]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId || !vaultKeyRef.current || !deviceIdRef.current) {
      return;
    }

    const existingEntry = entriesRef.current.find((entry) => entry.id === id);
    if (!existingEntry) {
      return;
    }

    await queueLocalMutation({
      userId,
      entry: existingEntry,
      vaultKey: vaultKeyRef.current,
      deviceId: deviceIdRef.current,
      updatedAt: new Date().toISOString(),
      deletedAt: new Date().toISOString(),
      mutationId: createRandomId(),
      operation: "delete",
    });

    setEntries(await loadStoredEntries(userId, vaultKeyRef.current));
    setSyncStatus("saved-local");
    setSyncMessage("Deleted locally.");
    router.push("/app");
    void syncNow();
  }, [router, syncNow, userId]);

  return (
    <EntriesContext.Provider
      value={{
        entries,
        isHydrated,
        syncStatus,
        syncMessage,
        addEntry,
        updateEntry,
        deleteEntry,
        syncNow,
      }}
    >
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  return useContext(EntriesContext);
}
