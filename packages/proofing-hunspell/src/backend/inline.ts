import { createHunspellFromStrings, type Hunspell } from "hunspell-wasm";
import type { HunspellBackend, HunspellDictionarySource } from "../types";

/** Message of the error raised for a dictionary that is not loaded, recognised across the worker boundary. */
export const hunspellNotLoadedMessage = "Hunspell dictionary is not loaded";

/**
 * Runs Hunspell on the calling thread; the worker entry wraps this same backend.
 *
 * Loading an already loaded key is a no-op, so connections sharing one worker
 * parse each dictionary once. With a cap, the least recently used dictionary
 * is released when another one loads; callers recover by loading it again.
 *
 * @param maxInstances - Dictionaries kept at once.
 * @returns Backend.
 */
export function createInlineHunspellBackend(maxInstances = Number.POSITIVE_INFINITY): HunspellBackend {
  const instances = new Map<string, Hunspell>();
  // Words each instance received at runtime; only these may be removed again,
  // so a user word that the dictionary already knew is never deleted from it.
  const added = new WeakMap<Hunspell, Set<string>>();
  let userWords: readonly string[] = [];

  /**
   * Adds user words the instance does not accept yet.
   *
   * @param instance - Hunspell instance.
   */
  const addUserWords = (instance: Hunspell): void => {
    const words = added.get(instance) ?? new Set<string>();
    for (const word of userWords) {
      if (words.has(word) || instance.testSpelling(word)) continue;
      instance.addWord(word);
      words.add(word);
    }
    added.set(instance, words);
  };

  /**
   * Returns a loaded instance and marks it most recently used.
   *
   * @param key - Dictionary key.
   * @returns Hunspell instance.
   */
  const read = (key: string): Hunspell => {
    const instance = instances.get(key);
    if (instance === undefined) throw new Error(`${hunspellNotLoadedMessage}: ${key}`);
    instances.delete(key);
    instances.set(key, instance);
    return instance;
  };

  return {
    has: async (key: string) => instances.has(key),
    load: async (key: string, source: HunspellDictionarySource) => {
      if (instances.has(key)) return;
      const instance = await createHunspellFromStrings(source.aff, source.dic);
      addUserWords(instance);
      instances.set(key, instance);
      while (instances.size > maxInstances) {
        const [oldest, evicted] = instances.entries().next().value!;
        evicted.dispose();
        instances.delete(oldest);
      }
    },
    unload: async (key: string) => {
      instances.get(key)?.dispose();
      instances.delete(key);
    },
    check: async (key: string, words: readonly string[]) => {
      const instance = read(key);
      return words.map((word) => instance.testSpelling(word));
    },
    suggest: async (key: string, word: string) => read(key).getSpellingSuggestions(word),
    setUserWords: async (words: readonly string[]) => {
      userWords = [...words];
      const kept = new Set(userWords);
      for (const instance of instances.values()) {
        const words = added.get(instance) ?? new Set<string>();
        for (const word of [...words]) {
          if (kept.has(word)) continue;
          instance.removeWord(word);
          words.delete(word);
        }
        addUserWords(instance);
      }
    },
    dispose: () => {
      for (const instance of instances.values()) instance.dispose();
      instances.clear();
    }
  };
}
