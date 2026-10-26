import type { ProofingIssueKind, ProofingProviderIssue, ProofingSegment } from "@quirekit/extension-proofing";
import type { Lint } from "harper.js";
import { mapHarperLintKind, resolveHarperSpan } from "./mapping";

/**
 * Copies a finding into provider values, releasing every nested WASM handle.
 * The caller retains responsibility for freeing the containing lint batch.
 *
 * @param lint - Live finding owned by the current answer.
 * @param segment - Source text and its coordinate authority.
 * @param kinds - Enabled finding categories.
 * @param maxSuggestions - Limit applied after replacement deduplication.
 * @returns Copied finding, or null for excluded/invalid results.
 */
export function projectHarperIssue(
  lint: Lint,
  segment: ProofingSegment,
  kinds: ReadonlySet<ProofingIssueKind>,
  maxSuggestions: number
): ProofingProviderIssue | null {
  const ruleId = lint.lint_kind();
  const kind = mapHarperLintKind(ruleId);
  if (!kinds.has(kind)) return null;
  const range = readRange(lint, segment.text);
  if (range === null || range.end <= range.start) return null;
  // A language split inside a sentence must not acquire sentence-start rules.
  if (!segment.startsBlock && ruleId === "Capitalization" && range.start === segment.text.search(/\p{L}/u)) return null;
  return {
    segmentId: segment.id,
    start: range.start,
    end: range.end,
    kind,
    message: lint.message(),
    replacements: readReplacements(lint, maxSuggestions),
    ruleId
  };
}

/**
 * Projects the temporary native span into validated source UTF-16 offsets.
 *
 * @param lint - Live finding.
 * @param text - Checked source segment.
 * @returns Validated JS range, or null when the problem text does not match.
 */
function readRange(lint: Lint, text: string): ReturnType<typeof resolveHarperSpan> {
  const span = lint.span();
  try {
    return resolveHarperSpan(text, span.start, span.end, lint.get_problem_text());
  } finally {
    span.free();
  }
}

/**
 * Copies and bounds replacements without retaining native suggestion objects.
 *
 * @param lint - Live finding.
 * @param limit - Maximum number of distinct replacements.
 * @returns Copied, trimmed and deduplicated replacement strings.
 */
function readReplacements(lint: Lint, limit: number): string[] {
  const suggestions = lint.suggestions();
  try {
    return [...new Set(suggestions.map(suggestion => suggestion.get_replacement_text().trim()))].slice(0, limit);
  } finally {
    for (const suggestion of suggestions) suggestion.free();
  }
}
