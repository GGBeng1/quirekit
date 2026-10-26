import {
  isWordParagraphStyleRegistry,
  type WordParagraphStyleRegistry
} from "../model";
import type {
  BrowserWordParagraphStyleUserDefaultsStoreOptions,
  WordParagraphStyleUserDefaultsStore
} from "./types";

/** Default versioned browser key for paragraph-style user defaults. */
export const defaultWordParagraphStyleUserDefaultsStorageKey =
  "quirekit.wordParagraphStyles.userDefaults.v1";

/**
 * Creates an isolated memory-backed user-default store.
 *
 * @param initialRegistry - Optional registry to seed without retaining ownership.
 * @returns Synchronous user-default store suitable for tests and transient hosts.
 */
export function createMemoryWordParagraphStyleUserDefaultsStore(
  initialRegistry: WordParagraphStyleRegistry | null = null
): WordParagraphStyleUserDefaultsStore {
  let registry = initialRegistry === null ? null : cloneRegistry(initialRegistry);
  return {
    load() {
      return registry === null ? null : cloneRegistry(registry);
    },
    save(nextRegistry) {
      assertValidRegistry(nextRegistry);
      registry = cloneRegistry(nextRegistry);
    },
    clear() {
      registry = null;
    }
  };
}

/**
 * Creates a browser-compatible user-default store over host-owned storage.
 *
 * Invalid or unreadable serialized values are treated as absent so corrupted
 * preferences cannot enter the document model.
 *
 * @param options - Storage implementation and optional product key.
 * @returns Synchronous validated user-default store.
 */
export function createBrowserWordParagraphStyleUserDefaultsStore(
  options: BrowserWordParagraphStyleUserDefaultsStoreOptions
): WordParagraphStyleUserDefaultsStore {
  const key = options.key
    ?? defaultWordParagraphStyleUserDefaultsStorageKey;
  return {
    load() {
      const serialized = options.storage.getItem(key);
      if (serialized === null) return null;
      try {
        const candidate: unknown = JSON.parse(serialized);
        return isWordParagraphStyleRegistry(candidate)
          ? cloneRegistry(candidate)
          : null;
      } catch {
        return null;
      }
    },
    save(registry) {
      assertValidRegistry(registry);
      options.storage.setItem(key, JSON.stringify(registry));
    },
    clear() {
      options.storage.removeItem(key);
    }
  };
}

/**
 * Rejects invalid registry data at persistence boundaries.
 *
 * @param registry - Candidate complete style registry.
 */
function assertValidRegistry(registry: WordParagraphStyleRegistry): void {
  if (!isWordParagraphStyleRegistry(registry)) {
    throw new TypeError("Expected a valid Word paragraph style registry.");
  }
}

/**
 * Clones one JSON-safe registry across ownership boundaries.
 *
 * @param registry - Registry to detach.
 * @returns Structurally equal registry with no shared mutable containers.
 */
function cloneRegistry(
  registry: WordParagraphStyleRegistry
): WordParagraphStyleRegistry {
  return JSON.parse(JSON.stringify(registry)) as WordParagraphStyleRegistry;
}
