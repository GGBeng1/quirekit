import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createHunspellWordEngine } from "./engine";
import { createHunspellProofingProvider } from "./provider";
import type { HunspellDictionaryLoader } from "./types";

/** Reads the bundled en-US dictionary from disk. */
const loadEnUs: HunspellDictionaryLoader = async () => ({
  aff: await readFile(new URL("../dictionaries/en-US.aff", import.meta.url), "utf8"),
  dic: await readFile(new URL("../dictionaries/en-US.dic", import.meta.url), "utf8")
});

/** Abort signal that never fires. */
const signal = new AbortController().signal;

describe("Hunspell provider", () => {
  it("flags misspellings in English text and accepts inflected and capitalized words", async () => {
    const provider = createHunspellProofingProvider({ dictionaries: { "en-US": loadEnUs } });
    const text = "The quick brown fox jumpd over teh lazy dogs. Running is London's favourite e.g. hobby.";
    const { issues } = await provider.check({
      segments: [{ id: "s", text, language: "en-US", surface: "body", startsBlock: true }],
      defaultLanguage: null,
      maxSuggestions: 3,
      signal
    });

    expect(issues.map((issue) => text.slice(issue.start, issue.end))).toEqual(["jumpd", "teh", "favourite"]);
  });

  it("suggests corrections lazily", async () => {
    const provider = createHunspellProofingProvider({ dictionaries: { "en-US": loadEnUs } });
    const suggestions = await provider.suggest!({ text: "teh", language: "en-US", kind: "spelling", maxSuggestions: 3, signal });

    expect(suggestions).toContain("the");
  });

  it("resolves regional tags to their primary dictionary through explicit or primary-tag fallbacks", () => {
    const engine = createHunspellWordEngine({ dictionaries: { en: loadEnUs }, fallbacks: { "en-AU": "en" } });

    expect(engine.supportsLanguage("en-AU")).toBe(true);
    expect(engine.supportsLanguage("EN-gb")).toBe(true);
    expect(engine.supportsLanguage("fr-FR")).toBe(false);
  });

  it("accepts user words without deleting dictionary words when the list changes", async () => {
    const engine = createHunspellWordEngine({ dictionaries: { "en-US": loadEnUs } });
    await engine.setUserWords!(["QuireKit", "the"]);
    expect(await engine.isCorrect(["QuireKit", "the"], "en-US", signal)).toEqual([true, true]);

    await engine.setUserWords!([]);
    expect(await engine.isCorrect(["QuireKit", "the"], "en-US", signal)).toEqual([false, true]);
  });
});
