import type { ProofingWordListOptions } from "@quirekit/extension-proofing";

/** Text of one Hunspell dictionary. */
export interface HunspellDictionarySource {
  /** Affix file (`.aff`) content. */
  readonly aff: string;
  /** Word list (`.dic`) content. */
  readonly dic: string;
}

/**
 * Loads one dictionary on first use of its language.
 *
 * @returns Dictionary text.
 */
export type HunspellDictionaryLoader = () => Promise<HunspellDictionarySource>;

/** Hunspell operations, executed in a worker or on the calling thread. */
export interface HunspellBackend {
  /**
   * Reports whether a dictionary is loaded, so a shared worker can skip downloading it again.
   *
   * @param key - Dictionary key.
   * @returns Whether the key is loaded.
   */
  readonly has: (key: string) => Promise<boolean>;
  /**
   * Loads a dictionary under a key; a key that is already loaded is kept.
   *
   * @param key - Dictionary key.
   * @param source - Dictionary text.
   */
  readonly load: (key: string, source: HunspellDictionarySource) => Promise<void>;
  /**
   * Releases a dictionary.
   *
   * @param key - Dictionary key.
   */
  readonly unload: (key: string) => Promise<void>;
  /**
   * Tests words against a dictionary.
   *
   * @param key - Dictionary key.
   * @param words - Words to test.
   * @returns One verdict per word.
   */
  readonly check: (key: string, words: readonly string[]) => Promise<readonly boolean[]>;
  /**
   * Suggests replacements for one word.
   *
   * @param key - Dictionary key.
   * @param word - Misspelled word.
   * @returns Replacements, best first.
   */
  readonly suggest: (key: string, word: string) => Promise<readonly string[]>;
  /**
   * Replaces the user words added to every loaded and future dictionary.
   *
   * @param words - User dictionary words.
   */
  readonly setUserWords: (words: readonly string[]) => Promise<void>;
  /** Releases every dictionary and the worker, if any. */
  readonly dispose: () => void;
}

/** Options of the Hunspell provider. */
export interface HunspellProofingOptions {
  /** Dictionary loaders keyed by BCP 47 tag, such as `en-US`. */
  readonly dictionaries: Readonly<Record<string, HunspellDictionaryLoader>>;
  /** Extra language-to-dictionary mappings, such as `{ "en-AU": "en-GB" }`. */
  readonly fallbacks?: Readonly<Record<string, string>> | undefined;
  /**
   * Creates the worker hosting Hunspell; without it Hunspell runs on the calling thread.
   * A `SharedWorker` lets every tab of the same origin share loaded dictionaries.
   *
   * @returns Module worker or shared worker running `@quirekit/proofing-hunspell/worker`.
   */
  readonly createWorker?: (() => Worker | SharedWorker) | undefined;
  /** Dictionaries kept loaded at once; the least recently used is released. Defaults to 4. */
  readonly maxLoadedDictionaries?: number | undefined;
  /** Tokenization rules of the word-list adapter. */
  readonly wordList?: ProofingWordListOptions | undefined;
}
