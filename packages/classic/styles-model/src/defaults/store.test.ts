import { describe, expect, it } from "vitest";
import { createDefaultWordParagraphStyleRegistry } from "../model";
import {
  createBrowserWordParagraphStyleUserDefaultsStore,
  createMemoryWordParagraphStyleUserDefaultsStore
} from "./adapters";

describe("Word paragraph style user defaults stores", () => {
  it("clones memory-backed registries at every ownership boundary", () => {
    const source = createDefaultWordParagraphStyleRegistry();
    const store = createMemoryWordParagraphStyleUserDefaultsStore(source);
    const first = store.load();
    const second = store.load();

    expect(first).toEqual(source);
    expect(first).not.toBe(source);
    expect(second).not.toBe(first);

    store.clear();
    expect(store.load()).toBeNull();
  });

  it("persists valid registries and ignores malformed browser data", () => {
    const storage = createTestStorage();
    const store = createBrowserWordParagraphStyleUserDefaultsStore({
      storage,
      key: "quirekit.test.styles"
    });
    const registry = createDefaultWordParagraphStyleRegistry();

    store.save(registry);
    expect(store.load()).toEqual(registry);

    storage.setItem("quirekit.test.styles", "{\"styles\":[]}");
    expect(store.load()).toBeNull();
    store.clear();
    expect(storage.getItem("quirekit.test.styles")).toBeNull();
  });
});

/**
 * Creates one deterministic synchronous Web Storage substitute.
 *
 * @returns In-memory string storage compatible with the browser adapter.
 */
function createTestStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}
