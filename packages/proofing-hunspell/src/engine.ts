import type { ProofingWordEngine } from "@quirekit/extension-proofing";
import { createInlineHunspellBackend, hunspellNotLoadedMessage } from "./backend/inline";
import { createWorkerHunspellBackend } from "./backend/worker-client";
import type { HunspellProofingOptions } from "./types";

/**
 * Creates a word engine backed by Hunspell dictionaries.
 *
 * Dictionaries load on first use of their language and stay loaded up to a
 * limit; the least recently used one is released first. A language resolves
 * to its exact tag, then an explicit fallback, then its primary language tag.
 *
 * @param options - Dictionaries, fallbacks, and worker factory.
 * @returns Word engine.
 */
export function createHunspellWordEngine(options: HunspellProofingOptions): ProofingWordEngine {
  const backend = options.createWorker === undefined
    ? createInlineHunspellBackend()
    : createWorkerHunspellBackend(options.createWorker());
  const keys = new Map(Object.keys(options.dictionaries).map((key) => [key.toLowerCase(), key]));
  const fallbacks = new Map(Object.entries(options.fallbacks ?? {}).map(([from, to]) => [from.toLowerCase(), to]));
  const maxLoaded = Math.max(1, options.maxLoadedDictionaries ?? 4);
  const loading = new Map<string, Promise<void>>();

  /**
   * Resolves the dictionary of a language.
   *
   * @param language - BCP 47 tag.
   * @returns Dictionary key, or null without a dictionary.
   */
  const resolve = (language: string): string | null => {
    const tag = language.toLowerCase();
    const fallback = fallbacks.get(tag);
    return keys.get(tag)
      ?? (fallback === undefined ? undefined : keys.get(fallback.toLowerCase()))
      ?? keys.get(tag.split("-")[0]!)
      ?? null;
  };

  /**
   * Loads a dictionary once and marks it most recently used.
   *
   * A shared worker may already hold the dictionary for another tab, in which
   * case nothing is downloaded.
   *
   * @param key - Dictionary key.
   */
  const ensure = async (key: string): Promise<void> => {
    let promise = loading.get(key);
    if (promise === undefined) {
      promise = backend.has(key).then(async (loaded) => {
        if (!loaded) await backend.load(key, await options.dictionaries[key]!());
      });
      promise.catch(() => loading.delete(key));
    }
    loading.delete(key);
    loading.set(key, promise);
    if (loading.size > maxLoaded) {
      const oldest = loading.keys().next().value!;
      loading.delete(oldest);
      void backend.unload(oldest);
    }
    await promise;
  };

  /**
   * Runs an operation on a language's dictionary, reloading it once if a shared worker evicted it.
   *
   * @param language - BCP 47 tag.
   * @param signal - Abort signal of the owning request.
   * @param run - Operation on the loaded key.
   * @returns Operation result.
   */
  const withDictionary = async <Value>(
    language: string,
    signal: AbortSignal,
    run: (key: string) => Promise<Value>
  ): Promise<Value> => {
    const key = await prepare(language, signal);
    try {
      return await run(key);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.startsWith(hunspellNotLoadedMessage)) throw error;
      loading.delete(key);
      await ensure(key);
      return run(key);
    }
  };

  /**
   * Resolves and loads the dictionary of a language.
   *
   * @param language - BCP 47 tag.
   * @param signal - Abort signal of the owning request.
   * @returns Loaded dictionary key.
   */
  const prepare = async (language: string, signal: AbortSignal): Promise<string> => {
    const key = resolve(language);
    if (key === null) throw new Error(`No Hunspell dictionary for ${language}`);
    await ensure(key);
    signal.throwIfAborted();
    return key;
  };

  return {
    id: "hunspell",
    supportsLanguage: (language) => resolve(language) !== null,
    isCorrect: (words, language, signal) => withDictionary(language, signal, (key) => backend.check(key, words)),
    suggest: (word, language, signal) => withDictionary(language, signal, (key) => backend.suggest(key, word)),
    setUserWords: (words) => backend.setUserWords(words),
    dispose: () => backend.dispose()
  };
}
