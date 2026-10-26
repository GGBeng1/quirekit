import type { ProofingIssueKind } from "@quirekit/extension-proofing";
import { Dialect } from "harper.js";

/** Harper lint kinds reported as spelling. */
const spellingKinds = new Set(["Spelling", "Typo"]);

/** Harper lint kinds reported as style; every other kind is grammar. */
const styleKinds = new Set(["Style", "Readability", "Redundancy", "Enhancement", "WordChoice", "Regionalism", "Formatting"]);

/** English regions mapped onto Harper dialects; other English tags use American English. */
const regionDialects: Readonly<Record<string, Dialect>> = {
  gb: Dialect.British,
  uk: Dialect.British,
  ie: Dialect.British,
  au: Dialect.Australian,
  nz: Dialect.Australian,
  ca: Dialect.Canadian,
  in: Dialect.Indian
};

/**
 * Maps a Harper lint kind onto a finding category.
 *
 * @param kind - Harper lint kind.
 * @returns Finding category.
 */
export function mapHarperLintKind(kind: string): ProofingIssueKind {
  if (spellingKinds.has(kind)) return "spelling";
  return styleKinds.has(kind) ? "style" : "grammar";
}

/**
 * Picks the Harper dialect of a language.
 *
 * @param language - BCP 47 tag.
 * @returns Dialect, or null for languages other than English.
 */
export function resolveHarperDialect(language: string): Dialect | null {
  const [primary, region] = language.toLowerCase().split("-");
  if (primary !== "en") return null;
  return regionDialects[region ?? ""] ?? Dialect.American;
}

/**
 * Resolves a Harper span to UTF-16 offsets.
 *
 * harper.js reports UTF-16 offsets; the problem text is compared anyway, and
 * code-point offsets are converted, so a change in the binding cannot shift
 * underlines next to emoji.
 *
 * @param text - Linted text.
 * @param start - Reported start.
 * @param end - Reported end.
 * @param problem - Flagged text reported by Harper.
 * @returns UTF-16 offsets, or null when neither reading matches.
 */
export function resolveHarperSpan(
  text: string,
  start: number,
  end: number,
  problem: string
): { start: number; end: number } | null {
  if (text.slice(start, end) === problem) return { start, end };
  const points = [...text];
  const from = points.slice(0, start).join("").length;
  const to = from + points.slice(start, end).join("").length;
  return text.slice(from, to) === problem ? { start: from, end: to } : null;
}
