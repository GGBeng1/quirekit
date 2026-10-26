import { describe, expect, it, vi } from "vitest";
import type { ProofingWordEngine } from "../types";
import { createWordListProofingProvider } from "./provider";

/**
 * Creates an engine knowing a fixed English word list.
 *
 * @param known - Correct words.
 * @returns Engine double with a spy on lookups.
 */
function createEngine(known: readonly string[]) {
  const words = new Set(known);
  const isCorrect = vi.fn(async (list: readonly string[]) => list.map((word) => words.has(word) || words.has(word.toLowerCase())));
  const engine: ProofingWordEngine = {
    id: "list",
    supportsLanguage: (language) => language.startsWith("en"),
    isCorrect,
    suggest: async (word) => [`${word}!`, "it's"]
  };
  return { engine, isCorrect };
}

/**
 * Checks one English segment.
 *
 * @param engine - Word engine.
 * @param value - Segment text.
 * @param language - Segment language.
 * @returns Flagged substrings.
 */
async function flag(engine: ProofingWordEngine, value: string, language: string | null = "en-US"): Promise<string[]> {
  const provider = createWordListProofingProvider(engine);
  const { issues } = await provider.check({
    segments: [{ id: "s", text: value, language, surface: "body", startsBlock: true }],
    defaultLanguage: "en-US",
    maxSuggestions: 3,
    signal: new AbortController().signal
  });
  return issues.map((issue) => value.slice(issue.start, issue.end));
}

describe("createWordListProofingProvider", () => {
  it("flags unknown words and skips acronyms, numbers, addresses, and single letters", async () => {
    const { engine } = createEngine(["the", "cat", "see"]);

    expect(await flag(engine, "The NASA cat teh a 3rd 42 e.g. see https://x.example/teh mail@teh.example")).toEqual(["teh"]);
  });

  it("normalizes curly apostrophes and retries abbreviations with their period", async () => {
    const { engine } = createEngine(["don't", "etc."]);

    expect(await flag(engine, "don’t etc. etc")).toEqual(["etc"]);
  });

  it("looks up each distinct word once and caches verdicts across requests", async () => {
    const { engine, isCorrect } = createEngine(["cat"]);
    const provider = createWordListProofingProvider(engine);
    const request = {
      segments: [{ id: "s", text: "cat cat dgo dgo", language: "en-US", surface: "body" as const, startsBlock: true }],
      defaultLanguage: null,
      maxSuggestions: 3,
      signal: new AbortController().signal
    };
    await provider.check(request);
    await provider.check(request);

    expect(isCorrect).toHaveBeenCalledTimes(1);
    expect(isCorrect.mock.calls[0]![0]).toEqual(["cat", "dgo"]);
  });

  it("ignores languages without a dictionary", async () => {
    const { engine, isCorrect } = createEngine([]);

    expect(await flag(engine, "bonjour", "fr-FR")).toEqual([]);
    expect(isCorrect).not.toHaveBeenCalled();
  });

  it("restores curly apostrophes in suggestions", async () => {
    const { engine } = createEngine([]);
    const provider = createWordListProofingProvider(engine);
    const suggestions = await provider.suggest!({
      text: "its’", language: "en-US", kind: "spelling", maxSuggestions: 1, signal: new AbortController().signal
    });

    expect(suggestions).toEqual(["its’!"]);
  });
});
