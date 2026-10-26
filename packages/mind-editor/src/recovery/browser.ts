import { MindMapRecoveryError } from "./errors";
import type { MindMapRecoveryRecord, MindMapRecoveryStore } from "./types";

const database = "quirekit-mind-map-recovery", table = "drafts";
/** @param factory - Explicit mounted-window storage. @returns One short-lived database connection. */
function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(database, 1); let rejected = false;
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(table)) request.result.createObjectStore(table); };
    request.onerror = () => { rejected = true; reject(request.error); };
    request.onblocked = () => { rejected = true; reject(new MindMapRecoveryError("draftBlocked")); };
    request.onsuccess = () => {
      if (rejected) request.result.close();
      else { request.result.onversionchange = () => request.result.close(); resolve(request.result); }
    };
  });
}
/** @param factory - Browser owner. @param key - Slot. @param mode - Transaction permission. @param update - Atomic transaction-local mutation.
 * @returns Stored value or mutation acceptance after commit, never before. */
async function transact(factory: IDBFactory, key: string, mode: IDBTransactionMode, update?: (value: unknown, store: IDBObjectStore) => boolean): Promise<unknown> {
  const db = await open(factory);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(table, mode), store = transaction.objectStore(table), request = store.get(key);
      let result: unknown = null;
      request.onsuccess = () => {
        try { result = update ? update(request.result ?? null, store) : request.result ?? null; }
        catch (error) { transaction.abort(); reject(error); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error ?? new MindMapRecoveryError("draftAborted"));
      transaction.onerror = () => { /* Transaction abort owns the single quota/error result. */ };
    });
  } finally { db.close(); }
}
/** @param factory - Explicit mounted-window IndexedDB; no import-time browser work. @returns Transaction-CAS store. */
export function createMindMapRecoveryStore(factory: IDBFactory): MindMapRecoveryStore {
  return {
    /** @param key - Scoped slot. @returns Untrusted stored value. */ load(key) { return transact(factory, key, "readonly"); },
    /** @param key - Scoped slot. @param expected - Observed token. @param record - Valid checkpoint. @returns Atomic write acceptance. */
    async save(key, expected, record) {
      return await transact(factory, key, "readwrite", (value, store) => {
        if (value === null ? expected !== null : (value as MindMapRecoveryRecord).token !== expected) return false;
        store.put(record, key); return true;
      }) as boolean;
    },
    /** @param key - Scoped slot. @param expected - Exact inspected token. @returns Atomic removal acceptance. */
    async remove(key, expected) {
      return await transact(factory, key, "readwrite", (value, store) => {
        if (!value || (value as MindMapRecoveryRecord).token !== expected) return false;
        store.delete(key); return true;
      }) as boolean;
    },
  };
}
