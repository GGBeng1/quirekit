import type { QuireWebFontCache, QuireWebFontCacheRecord } from "../types";
import { QuireWebFontError } from "../types";

const DEFAULT_DATABASE_NAME = "quirekit-web-fonts";
const STORE_NAME = "assets";
const FAMILY_INDEX = "normalizedFamily";

/** Options used to open the IndexedDB font cache. */
export interface QuireIndexedDbFontCacheOptions {
  /** IndexedDB factory supplied by the owning browser realm. */
  readonly indexedDB?: IDBFactory | undefined;
  /** Optional database name for host isolation or tests. */
  readonly databaseName?: string | undefined;
}

/**
 * Creates a lazy IndexedDB-backed font binary cache.
 *
 * @param options - Browser factory and optional database name.
 * @returns Persistent cache that opens on first use.
 */
export function createQuireIndexedDbFontCache(
  options: QuireIndexedDbFontCacheOptions = {}
): QuireWebFontCache {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (factory === undefined) {
    throw new QuireWebFontError("unsupported", "IndexedDB is unavailable in this realm");
  }
  let database: Promise<IDBDatabase> | undefined;

  /** @returns Open font cache database. */
  function openDatabase(): Promise<IDBDatabase> {
    database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(options.databaseName ?? DEFAULT_DATABASE_NAME, 1);
      request.onupgradeneeded = (): void => {
        const db = request.result;
        const store = db.objectStoreNames.contains(STORE_NAME)
          ? request.transaction!.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, { keyPath: "key" });
        if (!store.indexNames.contains(FAMILY_INDEX)) {
          store.createIndex(FAMILY_INDEX, FAMILY_INDEX, { unique: false });
        }
      };
      request.onsuccess = (): void => resolve(request.result);
      request.onerror = (): void => reject(cacheError("open", request.error));
      request.onblocked = (): void => reject(cacheError("open", request.error));
    });
    return database;
  }

  return {
    persistent: true,
    /** @inheritdoc */
    async get(key: string): Promise<QuireWebFontCacheRecord | undefined> {
      const db = await openDatabase();
      return runRequest<QuireWebFontCacheRecord | undefined>(
        db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key),
        "read"
      );
    },
    /** @inheritdoc */
    async put(record: QuireWebFontCacheRecord): Promise<void> {
      const db = await openDatabase();
      await runRequest(
        db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(record),
        "write"
      );
    },
    /** @inheritdoc */
    async delete(key: string): Promise<void> {
      const db = await openDatabase();
      await runRequest(
        db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(key),
        "delete"
      );
    },
    /** @inheritdoc */
    async deleteFamily(normalizedFamily: string): Promise<void> {
      const db = await openDatabase();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const index = transaction.objectStore(STORE_NAME).index(FAMILY_INDEX);
      await deleteCursorRange(index.openKeyCursor(IDBKeyRange.only(normalizedFamily)), transaction);
    },
    /** @inheritdoc */
    destroy(): void {
      void database?.then((db) => db.close());
      database = undefined;
    }
  };
}

/**
 * Converts one request callback into a promise.
 *
 * @param request - IndexedDB request.
 * @param operation - Diagnostic operation label.
 * @returns Request result after success.
 */
function runRequest<T>(request: IDBRequest<T>, operation: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = (): void => resolve(request.result);
    request.onerror = (): void => reject(cacheError(operation, request.error));
  });
}

/**
 * Deletes every primary key returned by an index cursor.
 *
 * @param request - Key cursor request for one family.
 * @param transaction - Owning read-write transaction.
 * @returns Completion after the transaction commits.
 */
function deleteCursorRange(
  request: IDBRequest<IDBCursor | null>,
  transaction: IDBTransaction
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    request.onsuccess = (): void => {
      const cursor = request.result;
      if (cursor === null) return;
      transaction.objectStore(STORE_NAME).delete(cursor.primaryKey);
      cursor.continue();
    };
    request.onerror = (): void => reject(cacheError("delete family", request.error));
    transaction.oncomplete = (): void => resolve();
    transaction.onerror = (): void => reject(cacheError("delete family", transaction.error));
    transaction.onabort = (): void => reject(cacheError("delete family", transaction.error));
  });
}

/**
 * Creates a typed cache diagnostic.
 *
 * @param operation - Failed cache operation.
 * @param cause - Browser error.
 * @returns Typed web-font error.
 */
function cacheError(operation: string, cause: unknown): QuireWebFontError {
  return new QuireWebFontError("cache", `Failed to ${operation} the web font cache`, { cause });
}
