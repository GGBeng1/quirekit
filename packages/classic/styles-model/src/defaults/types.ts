import type { WordParagraphStyleRegistry } from "../model";

/** Synchronous host-owned persistence for Word paragraph-style user defaults. */
export interface WordParagraphStyleUserDefaultsStore {
  /**
   * Reads the current user-default registry.
   *
   * @returns A detached valid registry, or null when no default is stored.
   */
  load(): WordParagraphStyleRegistry | null;
  /**
   * Replaces the current user-default registry without mutating the document.
   *
   * @param registry - Complete valid registry to persist.
   */
  save(registry: WordParagraphStyleRegistry): void;
  /** Removes the stored user-default registry without changing the document. */
  clear(): void;
}

/** Minimal synchronous string storage required by the browser adapter. */
export interface WordParagraphStyleUserDefaultsStorage {
  /**
   * Reads one serialized value.
   *
   * @param key - Stable storage key.
   * @returns Stored string, or null when absent.
   */
  getItem(key: string): string | null;
  /**
   * Stores one serialized value.
   *
   * @param key - Stable storage key.
   * @param value - Serialized registry value.
   */
  setItem(key: string, value: string): void;
  /**
   * Removes one serialized value.
   *
   * @param key - Stable storage key.
   */
  removeItem(key: string): void;
}

/** Options for constructing a browser-compatible user-default store. */
export interface BrowserWordParagraphStyleUserDefaultsStoreOptions {
  /** Host-owned synchronous storage implementation. */
  readonly storage: WordParagraphStyleUserDefaultsStorage;
  /** Optional product-specific storage key. */
  readonly key?: string | undefined;
}
