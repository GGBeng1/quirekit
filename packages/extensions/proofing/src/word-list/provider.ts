import type {
  ProofingCheckRequest,
  ProofingProvider,
  ProofingProviderIssue,
  ProofingWordEngine,
  ProofingWordListOptions
} from "../types";
import { tokenizeProofingWords, type ProofingTokenRules } from "./tokens";

/** Verdict caches keyed by language, then by lookup. */
type VerdictCache = Map<string, Map<string, boolean>>;

/**
 * Adapts a word-level engine, such as a Hunspell dictionary, into a provider.
 *
 * The adapter owns tokenization, skip rules, abbreviation retries, and a
 * verdict cache, so an engine only answers "is this word correct" and "what
 * could it be".
 *
 * @param engine - Word engine.
 * @param options - Tokenization rules and cache size.
 * @returns Spelling provider.
 */
export function createWordListProofingProvider(
  engine: ProofingWordEngine,
  options: ProofingWordListOptions = {}
): ProofingProvider {
  const rules: ProofingTokenRules = {
    ignoreUppercase: options.ignoreUppercase ?? true,
    ignoreWordsWithNumbers: options.ignoreWordsWithNumbers ?? true
  };
  const maxCachedWords = options.maxCachedWords ?? 20_000;
  const cache: VerdictCache = new Map();
  return {
    id: engine.id,
    getCapabilities: () => ({ issueKinds: ["spelling"], supportsLanguage: engine.supportsLanguage }),
    check: async (request) => ({ issues: await checkSegments(engine, request, rules, cache, maxCachedWords) }),
    suggest: async ({ text, language, maxSuggestions, signal }) => {
      if (language === null || !engine.supportsLanguage(language)) return [];
      const curly = text.includes("’");
      const suggestions = await engine.suggest(text.replaceAll("’", "'"), language, signal);
      return suggestions.slice(0, maxSuggestions).map((word) => curly ? word.replaceAll("'", "’") : word);
    },
    setUserWords: (words) => {
      cache.clear();
      return engine.setUserWords?.(words);
    },
    dispose: () => engine.dispose?.()
  };
}

/**
 * Checks every segment of a request.
 *
 * Phase order: lookups are grouped per language so the engine sees each
 * distinct word once; failing words followed by a period are retried with the
 * period, which dictionaries use for abbreviations such as "etc.".
 *
 * @param engine - Word engine.
 * @param request - Provider request.
 * @param rules - Tokenization rules.
 * @param cache - Verdict cache.
 * @param maxCachedWords - Cache size per language.
 * @returns Spelling findings.
 */
async function checkSegments(
  engine: ProofingWordEngine,
  request: ProofingCheckRequest,
  rules: ProofingTokenRules,
  cache: VerdictCache,
  maxCachedWords: number
): Promise<ProofingProviderIssue[]> {
  const work = request.segments.flatMap((segment) => {
    const language = segment.language ?? request.defaultLanguage;
    if (language === null || !engine.supportsLanguage(language)) return [];
    return [{ segment, language, tokens: tokenizeProofingWords(segment.text, language, rules) }];
  });
  const byLanguage = new Map<string, Set<string>>();
  for (const { language, tokens } of work) {
    const words = byLanguage.get(language) ?? new Set();
    for (const token of tokens) words.add(token.lookup);
    byLanguage.set(language, words);
  }
  await resolveVerdicts(engine, byLanguage, cache, maxCachedWords, request.signal);
  const retries = new Map<string, Set<string>>();
  for (const { language, tokens } of work) {
    for (const token of tokens) {
      if (token.dotted !== null && cache.get(language)?.get(token.lookup) === false) {
        retries.set(language, (retries.get(language) ?? new Set()).add(token.dotted));
      }
    }
  }
  await resolveVerdicts(engine, retries, cache, maxCachedWords, request.signal);
  return work.flatMap(({ segment, language, tokens }) => tokens
    .filter((token) => {
      const verdicts = cache.get(language);
      return verdicts?.get(token.lookup) === false && (token.dotted === null || verdicts.get(token.dotted) !== true);
    })
    .map((token) => ({ segmentId: segment.id, start: token.start, end: token.end, kind: "spelling" as const })));
}

/**
 * Fills the cache with verdicts for words it does not hold yet.
 *
 * @param engine - Word engine.
 * @param words - Words per language.
 * @param cache - Verdict cache.
 * @param maxCachedWords - Cache size per language.
 * @param signal - Request abort signal.
 */
async function resolveVerdicts(
  engine: ProofingWordEngine,
  words: ReadonlyMap<string, ReadonlySet<string>>,
  cache: VerdictCache,
  maxCachedWords: number,
  signal: AbortSignal
): Promise<void> {
  for (const [language, set] of words) {
    let verdicts = cache.get(language);
    if (verdicts === undefined || verdicts.size + set.size > maxCachedWords) {
      verdicts = new Map();
      cache.set(language, verdicts);
    }
    const unknown = [...set].filter((word) => !verdicts.has(word));
    if (unknown.length === 0) continue;
    signal.throwIfAborted();
    const results = await engine.isCorrect(unknown, language, signal);
    unknown.forEach((word, index) => verdicts.set(word, results[index] === true));
  }
}
