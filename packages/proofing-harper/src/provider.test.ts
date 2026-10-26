import { Dialect, LocalLinter } from "harper.js";
import { binary } from "harper.js/binary";
import { describe, expect, it } from "vitest";
import { mapHarperLintKind, resolveHarperDialect, resolveHarperSpan } from "./mapping";
import { createHarperProofingProvider } from "./provider";

const signal = new AbortController().signal;

/**
 * Checks one English segment with a local Harper linter.
 *
 * @param text - Segment text.
 * @param language - Segment language.
 * @returns Flagged text, category, and replacements of each finding.
 */
async function check(text: string, language = "en-US") {
  const provider = createHarperProofingProvider({ createLinter: (dialect) => new LocalLinter({ binary, dialect }) });
  const { issues } = await provider.check({
    segments: [{ id: "s", text, language, surface: "body", startsBlock: true }],
    defaultLanguage: null,
    maxSuggestions: 3,
    signal
  });
  return issues.map((issue) => [text.slice(issue.start, issue.end), issue.kind, issue.replacements]);
}

describe("Harper provider", () => {
  it("reports grammar findings with deduplicated replacements and keeps offsets right after emoji", async () => {
    expect(await check("😀 This is is a test. He go to school.")).toEqual([
      ["is is", "grammar", ["is"]],
      ["go", "grammar", ["goes"]]
    ]);
    expect((await check("I has a apple. Their going to the store.")).at(-1)).toEqual(["Their", "grammar", ["They're"]]);
  }, 30_000);

  it("does not treat the first word of a mid-sentence segment as a sentence start", async () => {
    const provider = createHarperProofingProvider({ createLinter: (dialect) => new LocalLinter({ binary, dialect }) });
    const run = (startsBlock: boolean) => provider.check({
      segments: [{ id: "s", text: "the editor runs fast. It works.", language: "en-US", surface: "body", startsBlock }],
      defaultLanguage: null,
      maxSuggestions: 3,
      signal
    });

    expect((await run(true)).issues.map((issue) => issue.ruleId)).toContain("Capitalization");
    expect((await run(false)).issues).toEqual([]);
  }, 30_000);

  it("skips languages other than English", async () => {
    expect(await check("Il est est là.", "fr-FR")).toEqual([]);
  });

  it("maps lint kinds, dialects, and code-point spans", () => {
    expect(mapHarperLintKind("Typo")).toBe("spelling");
    expect(mapHarperLintKind("Redundancy")).toBe("style");
    expect(mapHarperLintKind("Agreement")).toBe("grammar");
    expect(resolveHarperDialect("en-GB")).toBe(Dialect.British);
    expect(resolveHarperDialect("en-NZ")).toBe(Dialect.Australian);
    expect(resolveHarperDialect("en")).toBe(Dialect.American);
    expect(resolveHarperDialect("de-DE")).toBeNull();
    expect(resolveHarperSpan("😀 teh", 2, 5, "teh")).toEqual({ start: 3, end: 6 });
    expect(resolveHarperSpan("ab", 0, 1, "x")).toBeNull();
  });
});
