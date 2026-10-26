import { WhiteboardError } from "@quirekit/whiteboard";
import type { WhiteboardDraftRecord, WhiteboardDraftStore } from "./types";

const database = "quirekit-whiteboard-drafts", table = "drafts";

/** @param factory - IndexedDB belonging to the mounted window. @returns One database connection, closed after each operation. */
function open(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(database, 1);
    let rejected = false;
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(table)) request.result.createObjectStore(table); };
    request.onerror = () => { rejected = true; reject(request.error); };
    request.onblocked = () => { rejected = true; reject(new WhiteboardError("storageBlocked", "请关闭旧页面后重试本机草稿保存")); };
    request.onsuccess = () => {
      if (rejected) request.result.close();
      else { request.result.onversionchange = () => request.result.close(); resolve(request.result); }
    };
  });
}

/** @param factory - Browser storage owner. @param key - Scoped slot. @param mode - Read or atomic mutation. @param update - Optional transaction-local mutation.
 * @returns Stored value or successful comparison, only after the transaction commits. */
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
      transaction.onabort = () => reject(transaction.error ?? new WhiteboardError("storageAborted", "本机草稿写入未完成"));
      transaction.onerror = () => { /* Abort reports the failure once, including quota errors. */ };
    });
  } finally { db.close(); }
}

/** @param factory - Explicit owner window storage; accessed only when recovery is enabled. @returns Atomic local store with no import-time browser dependency. */
export function createWhiteboardDraftStore(factory: IDBFactory): WhiteboardDraftStore {
  return {
    /** @param key - Scoped slot. @returns Untrusted checkpoint or null. */
    load(key) { return transact(factory, key, "readonly"); },
    /** @param key - Scoped slot. @param expected - Last observed token. @param record - Bounded source. @returns Whether the write won. */
    async save(key, expected, record) {
      return await transact(factory, key, "readwrite", (value, store) => {
        if (value === null ? expected !== null : (value as WhiteboardDraftRecord).token !== expected) return false;
        store.put(record, key); return true;
      }) as boolean;
    },
    /** @param key - Scoped slot. @param expected - Exact inspected token. @returns Whether this checkpoint was removed. */
    async remove(key, expected) {
      return await transact(factory, key, "readwrite", (value, store) => {
        if (!value || (value as WhiteboardDraftRecord).token !== expected) return false;
        store.delete(key); return true;
      }) as boolean;
    },
  };
}
