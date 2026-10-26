import { createWordListProofingProvider, type ProofingProvider } from "@quirekit/extension-proofing";
import { createHunspellWordEngine } from "./engine";
import type { HunspellDictionaryLoader, HunspellProofingOptions } from "./types";

/**
 * Creates a spelling provider backed by Hunspell.
 *
 * @param options - Dictionaries, fallbacks, worker factory, and tokenization rules.
 * @returns Provider for the Proofing extension.
 */
export function createHunspellProofingProvider(options: HunspellProofingOptions): ProofingProvider {
  return createWordListProofingProvider(createHunspellWordEngine(options), options.wordList);
}

/**
 * Fetches a text asset.
 *
 * @param url - Asset URL.
 * @returns Asset text.
 */
async function fetchText(url: string | URL): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to load ${String(url)}: ${response.status}`);
  return response.text();
}

/**
 * Creates a loader fetching a dictionary from the host's own or a CDN address.
 *
 * Dictionary licenses differ per language; the host is responsible for the
 * dictionaries it serves.
 *
 * @param affUrl - Affix file address.
 * @param dicUrl - Word list address.
 * @returns Dictionary loader.
 */
export function createHunspellDictionaryUrlLoader(affUrl: string | URL, dicUrl: string | URL): HunspellDictionaryLoader {
  return async () => {
    const [aff, dic] = await Promise.all([fetchText(affUrl), fetchText(dicUrl)]);
    return { aff, dic };
  };
}

/**
 * Loads the bundled American English dictionary (SCOWL, see `dictionaries/en-US.LICENSE.txt`).
 *
 * The files are resolved relative to this module, which bundlers that
 * understand `new URL(path, import.meta.url)` emit as assets.
 */
export const loadEnUsHunspellDictionary: HunspellDictionaryLoader = createHunspellDictionaryUrlLoader(
  new URL("../dictionaries/en-US.aff", import.meta.url),
  new URL("../dictionaries/en-US.dic", import.meta.url)
);

/** Loads the bundled British English dictionary (SCOWL "-ise" spelling, see `dictionaries/en-GB.LICENSE.txt`). */
export const loadEnGbHunspellDictionary: HunspellDictionaryLoader = createHunspellDictionaryUrlLoader(
  new URL("../dictionaries/en-GB.aff", import.meta.url),
  new URL("../dictionaries/en-GB.dic", import.meta.url)
);
