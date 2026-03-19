"use client";

import {
  startTransition,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Entry, StoredEntry, SyncStatus } from "./entries";
import { createEntryId, formatEntryDates } from "./entries";
import {
  backfillLocalEntries,
  bootstrapVault,
  fetchVaultSession,
  loadLocalEntries,
  queueLocalMutation,
  syncUserEntries,
} from "@/lib/sync/client";
import { importVaultKey } from "@/lib/sync/crypto";
import { cacheVaultKeyLocally, loadCachedVaultKey } from "@/lib/sync/device-vault";
import {
  clearLastActiveUserId,
  getDeviceId,
  getLastActiveUserId,
  setLastActiveUserId,
} from "@/lib/sync/local-store";
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

function sortEntries(entries: StoredEntry[]) {
  return [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function upsertEntry(entries: StoredEntry[], nextEntry: StoredEntry) {
  return sortEntries([
    ...entries.filter((entry) => entry.id !== nextEntry.id),
    nextEntry,
  ]);
}

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded, userId: authUserId } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const vaultKeyRef = useRef<CryptoKey | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const hydrateEntriesRef = useRef<(() => Promise<void>) | null>(null);
  const syncDelayTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const entriesRef = useRef(entries);
  const optimisticRevisionRef = useRef(0);
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  const syncRequestedRef = useRef(false);
  const syncLoopInFlightRef = useRef(false);

  const cachedUserId = useSyncExternalStore(
    () => () => {},
    getLastActiveUserId,
    () => null
  );
  const hasCheckedCachedUser = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    if (!authUserId) {
      return;
    }

    setLastActiveUserId(authUserId);
  }, [authUserId]);

  const userId = authUserId ?? cachedUserId;
  const canSyncRemotely = Boolean(authUserId && authUserId === userId);

  const replaceEntries = useCallback((nextEntries: StoredEntry[]) => {
    entriesRef.current = nextEntries;
    startTransition(() => {
      setEntries(nextEntries);
    });
  }, []);

  const clearScheduledRetry = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const clearScheduledSync = useCallback(() => {
    if (syncDelayTimeoutRef.current !== null) {
      window.clearTimeout(syncDelayTimeoutRef.current);
      syncDelayTimeoutRef.current = null;
    }
  }, []);

  const getSessionToken = useCallback(async () => {
    if (!canSyncRemotely) {
      return null;
    }

    const token = await getToken();
    return token ?? null;
  }, [canSyncRemotely, getToken]);

  const scheduleSyncRetry = useCallback((message: string) => {
    if (!userId || !navigator.onLine) {
      return;
    }

    clearScheduledRetry();
    clearScheduledSync();
    retryAttemptRef.current += 1;

    const delayMs = Math.min(2000 * 2 ** (retryAttemptRef.current - 1), 60000);
    const delaySeconds = Math.ceil(delayMs / 1000);

    setSyncStatus("error");
    setSyncMessage(`${message}. Sync will retry in ${delaySeconds}s.`);

    retryTimeoutRef.current = window.setTimeout(() => {
      if (vaultKeyRef.current) {
        syncRequestedRef.current = true;
        syncDelayTimeoutRef.current = window.setTimeout(() => {
          syncDelayTimeoutRef.current = null;
          if (syncLoopInFlightRef.current || !syncRequestedRef.current) {
            return;
          }

          void performSyncLoopRef.current?.();
        }, 0);
        return;
      }

      void hydrateEntriesRef.current?.();
    }, delayMs);
  }, [clearScheduledRetry, clearScheduledSync, userId]);

  const performSyncRef = useRef<(() => Promise<void>) | null>(null);
  const performSyncLoopRef = useRef<(() => Promise<void>) | null>(null);

  const performSync = useCallback(async () => {
    if (!userId || !vaultKeyRef.current) {
      return;
    }

    if (!navigator.onLine) {
      clearScheduledRetry();
      retryAttemptRef.current = 0;
      setSyncStatus("saved-local");
      setSyncMessage("Saved locally. Waiting for a connection.");
      return;
    }

    await persistQueueRef.current.catch(() => {});

    const sessionToken = await getSessionToken();
    if (!sessionToken) {
      clearScheduledRetry();
      retryAttemptRef.current = 0;
      setSyncStatus("saved-local");
      setSyncMessage(
        canSyncRemotely
          ? "Saved locally. Waiting for sign-in."
          : "Saved locally. Sign in to sync."
      );
      return;
    }

    clearScheduledRetry();
    const syncRevision = optimisticRevisionRef.current;
    setSyncStatus("syncing");
    setSyncMessage("Syncing in the background...");

    try {
      const syncResult = await syncUserEntries(userId, vaultKeyRef.current, sessionToken);
      retryAttemptRef.current = 0;
      if (syncRevision === optimisticRevisionRef.current) {
        replaceEntries(syncResult.entries);
      }
      setSyncStatus("saved-local");
      if (syncResult.pulledCount > 0 || syncResult.pushedCount > 0) {
        setSyncMessage(
          `Local database updated${syncResult.pushedCount > 0 ? `, ${syncResult.pushedCount} change${syncResult.pushedCount === 1 ? "" : "s"} synced` : ""}.`
        );
      } else if (syncResult.discardedCount > 0) {
        setSyncMessage("Local database is open. Sync resolved a remote conflict.");
      } else {
        setSyncMessage("Local database is up to date.");
      }
    } catch (error) {
      scheduleSyncRetry(getErrorMessage(error));
    }
  }, [canSyncRemotely, clearScheduledRetry, getSessionToken, replaceEntries, scheduleSyncRetry, userId]);

  useEffect(() => {
    performSyncRef.current = performSync;
  }, [performSync]);

  const performSyncLoop = useCallback(async () => {
    if (syncLoopInFlightRef.current) {
      return;
    }

    syncLoopInFlightRef.current = true;

    try {
      while (syncRequestedRef.current) {
        syncRequestedRef.current = false;
        await performSyncRef.current?.();
      }
    } finally {
      syncLoopInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    performSyncLoopRef.current = performSyncLoop;
  }, [performSyncLoop]);

  const scheduleBackgroundSync = useCallback((delayMs = 0) => {
    if (!userId) {
      return;
    }

    syncRequestedRef.current = true;
    clearScheduledRetry();

    if (syncLoopInFlightRef.current) {
      return;
    }

    clearScheduledSync();
    syncDelayTimeoutRef.current = window.setTimeout(() => {
      syncDelayTimeoutRef.current = null;
      void performSyncLoop();
    }, delayMs);
  }, [clearScheduledRetry, clearScheduledSync, performSyncLoop, userId]);

  const syncNow = useCallback(async () => {
    if (!userId) {
      return;
    }

    if (!vaultKeyRef.current) {
      void hydrateEntriesRef.current?.();
      return;
    }

    scheduleBackgroundSync(0);
  }, [scheduleBackgroundSync, userId]);

  useEffect(() => {
    return () => {
      clearScheduledRetry();
      clearScheduledSync();
    };
  }, [clearScheduledRetry, clearScheduledSync]);

  const unlockVaultFromServer = useCallback(async () => {
    if (!authUserId) {
      return null;
    }

    const sessionToken = await getSessionToken();
    if (!sessionToken) {
      throw new Error("Sign in once on this device to unlock your vault.");
    }

    await bootstrapVault(sessionToken);
    const session = await fetchVaultSession(sessionToken);
    await cacheVaultKeyLocally(authUserId, session.rawKey);

    const vaultKey = await importVaultKey(session.rawKey);
    vaultKeyRef.current = vaultKey;
    return vaultKey;
  }, [authUserId, getSessionToken]);

  const hydrateEntries = useCallback(async () => {
    if (!userId) {
      return;
    }

    setIsHydrated(false);
    setSyncStatus("loading");
    setSyncMessage("Opening local database...");
    deviceIdRef.current = getDeviceId();

    let localEntriesLoaded = false;

    try {
      const localEntries = await loadLocalEntries(userId);
      if (localEntries.length > 0) {
        localEntriesLoaded = true;
        replaceEntries(localEntries);
        setIsHydrated(true);
        setSyncStatus("saved-local");
        setSyncMessage("Opened instantly from local database.");
      }

      const cachedRawVaultKey = await loadCachedVaultKey(userId);

      if (cachedRawVaultKey) {
        const vaultKey = await importVaultKey(cachedRawVaultKey);
        vaultKeyRef.current = vaultKey;

        if (!localEntriesLoaded) {
          const nextEntries = await backfillLocalEntries(userId, vaultKey);
          replaceEntries(nextEntries);
          setIsHydrated(true);
          setSyncMessage(
            nextEntries.length > 0
              ? "Recovered your local database."
              : "Ready for your first entry."
          );
        }

        setSyncStatus("saved-local");
        if (canSyncRemotely) {
          scheduleBackgroundSync(1200);
        }
        return;
      }

      if (localEntriesLoaded) {
        if (authUserId && navigator.onLine) {
          setSyncStatus("loading");
          setSyncMessage("Refreshing secure sync access...");
          const vaultKey = await unlockVaultFromServer();
          if (!vaultKey) {
            throw new Error("Unable to unlock your vault.");
          }

          setSyncStatus("saved-local");
          setSyncMessage("Opened instantly from local database.");
          if (canSyncRemotely) {
            scheduleBackgroundSync(1200);
          }
          return;
        }

        setSyncStatus("saved-local");
        setSyncMessage(
          navigator.onLine
            ? "Opened instantly from local database. Sign in to sync."
            : "Opened instantly from local database. Waiting for a connection."
        );
        return;
      }

      if (!navigator.onLine) {
        replaceEntries([]);
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

      const nextEntries = await backfillLocalEntries(userId, vaultKey);
      replaceEntries(nextEntries);
      setIsHydrated(true);
      setSyncStatus("saved-local");
      setSyncMessage(nextEntries.length > 0 ? "Offline access is ready." : "Ready for your first entry.");

      if (canSyncRemotely) {
        scheduleBackgroundSync(1200);
      }
    } catch (error) {
      if (!localEntriesLoaded) {
        replaceEntries([]);
        setIsHydrated(true);
      }
      scheduleSyncRetry(getErrorMessage(error));
    }
  }, [authUserId, canSyncRemotely, replaceEntries, scheduleBackgroundSync, scheduleSyncRetry, unlockVaultFromServer, userId]);

  useEffect(() => {
    hydrateEntriesRef.current = hydrateEntries;
  }, [hydrateEntries]);

  useEffect(() => {
    if (!hasCheckedCachedUser || (!cachedUserId && !isLoaded)) {
      return;
    }

    if (!userId) {
      clearScheduledSync();
      clearScheduledRetry();
      retryAttemptRef.current = 0;
      syncRequestedRef.current = false;
      vaultKeyRef.current = null;
      deviceIdRef.current = null;
      clearLastActiveUserId();
      replaceEntries([]);
      setIsHydrated(false);
      setSyncStatus("loading");
      setSyncMessage(null);
      return;
    }

    void hydrateEntries();
  }, [cachedUserId, clearScheduledRetry, clearScheduledSync, hasCheckedCachedUser, hydrateEntries, isLoaded, replaceEntries, userId]);

  useEffect(() => {
    if (!isHydrated || !userId || !canSyncRemotely) {
      return;
    }

    const handleOnline = () => {
      if (vaultKeyRef.current) {
        scheduleBackgroundSync(400);
        return;
      }

      void hydrateEntries();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        scheduleBackgroundSync(0);
      }
    };

    const intervalId = window.setInterval(() => {
      scheduleBackgroundSync(0);
    }, 30000);

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canSyncRemotely, hydrateEntries, isHydrated, scheduleBackgroundSync, userId]);

  const queueBackgroundMutation = useCallback((params: Parameters<typeof queueLocalMutation>[0]) => {
    persistQueueRef.current = persistQueueRef.current
      .catch(() => {})
      .then(async () => {
        await queueLocalMutation(params);
      })
      .then(() => {
        scheduleBackgroundSync(600);
      })
      .catch((error) => {
        scheduleSyncRetry(getErrorMessage(error));
      });
  }, [scheduleBackgroundSync, scheduleSyncRetry]);

  const addEntry = useCallback(async (mood: number, bodyHtml: string) => {
    if (!userId || !vaultKeyRef.current) {
      return;
    }

    const deviceId = deviceIdRef.current ?? getDeviceId();
    deviceIdRef.current = deviceId;
    const now = new Date();
    const entryId = createEntryId(now);
    const updatedAt = now.toISOString();
    const mutationId = createRandomId();
    const newEntry: Entry = {
      id: entryId,
      mood,
      body: bodyHtml,
      tags: [],
      ...formatEntryDates(now),
    };
    const optimisticEntry: StoredEntry = {
      ...newEntry,
      updatedAt,
      deletedAt: null,
      deviceId,
      lastMutationId: mutationId,
    };

    optimisticRevisionRef.current += 1;
    replaceEntries(upsertEntry(entriesRef.current, optimisticEntry));
    setSyncStatus("saved-local");
    setSyncMessage("Saved locally. Sync queued.");
    router.push(`/app/entry/${entryId}`);

    queueBackgroundMutation({
      userId,
      entry: newEntry,
      storedEntry: optimisticEntry,
      vaultKey: vaultKeyRef.current,
      deviceId,
      updatedAt,
      deletedAt: null,
      mutationId,
      operation: "upsert",
    });
  }, [queueBackgroundMutation, replaceEntries, router, userId]);

  const updateEntry = useCallback(async (id: string, mood: number, bodyHtml: string) => {
    if (!userId || !vaultKeyRef.current) {
      return;
    }

    const existingEntry = entriesRef.current.find((entry) => entry.id === id);
    if (!existingEntry) {
      return;
    }

    const deviceId = deviceIdRef.current ?? getDeviceId();
    deviceIdRef.current = deviceId;
    const updatedAt = new Date().toISOString();
    const mutationId = createRandomId();
    const optimisticEntry: StoredEntry = {
      ...existingEntry,
      mood,
      body: bodyHtml,
      updatedAt,
      deletedAt: null,
      deviceId,
      lastMutationId: mutationId,
    };

    optimisticRevisionRef.current += 1;
    replaceEntries(upsertEntry(entriesRef.current, optimisticEntry));
    setSyncStatus("saved-local");
    setSyncMessage("Saved locally. Sync queued.");

    queueBackgroundMutation({
      userId,
      entry: {
        ...existingEntry,
        mood,
        body: bodyHtml,
      },
      storedEntry: optimisticEntry,
      vaultKey: vaultKeyRef.current,
      deviceId,
      updatedAt,
      deletedAt: null,
      mutationId,
      operation: "upsert",
    });
  }, [queueBackgroundMutation, replaceEntries, userId]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!userId || !vaultKeyRef.current) {
      return;
    }

    const existingEntry = entriesRef.current.find((entry) => entry.id === id);
    if (!existingEntry) {
      return;
    }

    const deviceId = deviceIdRef.current ?? getDeviceId();
    deviceIdRef.current = deviceId;
    const deletedAt = new Date().toISOString();
    const mutationId = createRandomId();

    optimisticRevisionRef.current += 1;
    replaceEntries(entriesRef.current.filter((entry) => entry.id !== id));
    setSyncStatus("saved-local");
    setSyncMessage("Deleted locally. Sync queued.");
    router.push("/app");

    queueBackgroundMutation({
      userId,
      entry: existingEntry,
      storedEntry: {
        ...existingEntry,
        updatedAt: deletedAt,
        deletedAt,
        deviceId,
        lastMutationId: mutationId,
      },
      vaultKey: vaultKeyRef.current,
      deviceId,
      updatedAt: deletedAt,
      deletedAt,
      mutationId,
      operation: "delete",
    });
  }, [queueBackgroundMutation, replaceEntries, router, userId]);

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
