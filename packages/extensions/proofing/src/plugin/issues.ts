import { Decoration, DecorationSet, type Node as PMNode } from "@quirekit/pm";
import type { ProofingAppearance, ProofingIssue } from "../types";
import type { ProofingBlockResult, ProofingPluginState } from "./types";

/** Decoration spec field holding the finding. */
const issueSpecKey = "proofingIssue";

/**
 * Normalizes a word for ignore and dictionary matching.
 *
 * @param word - Word as written.
 * @returns Case-folded NFC form with straight apostrophes.
 */
export function normalizeProofingWord(word: string): string {
  return word.normalize("NFC").replaceAll("’", "'").toLocaleLowerCase();
}

/**
 * Creates the underline decoration of one finding.
 *
 * @param issue - Finding in current positions.
 * @param appearance - Underline colors.
 * @returns Inline decoration carrying the finding.
 */
export function createIssueDecoration(issue: ProofingIssue, appearance: ProofingAppearance): Decoration {
  return Decoration.inline(issue.from, issue.to, {
    class: `qk-proofing-${issue.kind}`,
    style: `text-decoration-line: underline; text-decoration-style: wavy; text-decoration-color: ${appearance[issue.kind]}`
  }, { [issueSpecKey]: issue });
}

/**
 * Reads the finding of a decoration with its current positions.
 *
 * @param decoration - Finding decoration.
 * @returns Finding with mapped positions.
 */
export function readDecorationIssue(decoration: Decoration): ProofingIssue {
  const issue = (decoration.spec as Record<string, ProofingIssue>)[issueSpecKey]!;
  return issue.from === decoration.from && issue.to === decoration.to
    ? issue
    : { ...issue, from: decoration.from, to: decoration.to };
}

/**
 * Finds a finding decoration by identity.
 *
 * @param issues - Finding decorations.
 * @param id - Finding identity.
 * @returns Decoration, or undefined.
 */
export function findIssueDecoration(issues: DecorationSet, id: string): Decoration | undefined {
  return issues.find(undefined, undefined, (spec) => (spec as Record<string, ProofingIssue>)[issueSpecKey]?.id === id)[0];
}

/**
 * Replaces the findings of answered blocks.
 *
 * Block positions are shifted by the distance the block moved since
 * extraction; a block that was edited meanwhile never reaches this point
 * because its inflight entry is stale.
 *
 * @param value - State whose findings are updated.
 * @param doc - Current document.
 * @param blocks - Answered blocks with their current offset from extraction.
 * @param maxIssues - Findings kept for the whole document.
 * @param appearance - Underline colors.
 * @returns Updated findings, count, and limit flag.
 */
export function applyBlockResults(
  value: ProofingPluginState,
  doc: PMNode,
  blocks: readonly { readonly result: ProofingBlockResult; readonly delta: number }[],
  maxIssues: number,
  appearance: ProofingAppearance
): Pick<ProofingPluginState, "issues" | "issueCount" | "limited"> {
  let issues = value.issues;
  let issueCount = value.issueCount;
  let limited = value.limited;
  const added: Decoration[] = [];
  for (const { result, delta } of blocks) {
    const stale = issues.find(result.from + delta, result.to + delta);
    issues = issues.remove(stale);
    issueCount -= stale.length;
    for (const issue of result.issues) {
      const shifted = { ...issue, from: issue.from + delta, to: issue.to + delta };
      if (!isIssueVisible(value, shifted)) continue;
      if (issueCount + added.length >= maxIssues) {
        limited = true;
        break;
      }
      added.push(createIssueDecoration(shifted, appearance));
    }
  }
  return { issues: added.length === 0 ? issues : issues.add(doc, added), issueCount: issueCount + added.length, limited };
}

/**
 * Tests whether a new finding survives user ignores.
 *
 * @param value - Current plugin state.
 * @param issue - Finding in current positions.
 * @returns Whether the finding is kept.
 */
function isIssueVisible(value: ProofingPluginState, issue: ProofingIssue): boolean {
  if (value.suppressed.has(normalizeProofingWord(issue.text))) return false;
  return !value.ignored.find(issue.from, issue.to)
    .some((range) => range.from === issue.from && range.to === issue.to);
}

/**
 * Removes every finding whose word is suppressed.
 *
 * @param issues - Finding decorations.
 * @param suppressed - Normalized suppressed words.
 * @returns Remaining decorations and the removed count.
 */
export function removeSuppressedIssues(
  issues: DecorationSet,
  suppressed: ReadonlySet<string>
): { readonly issues: DecorationSet; readonly removed: number } {
  const matches = issues.find(undefined, undefined, (spec) => {
    const issue = (spec as Record<string, ProofingIssue>)[issueSpecKey];
    return issue !== undefined && suppressed.has(normalizeProofingWord(issue.text));
  });
  return { issues: issues.remove(matches), removed: matches.length };
}

/**
 * Finds the finding under a collapsed caret, which Word leaves unpainted while the user types it.
 *
 * @param issues - Finding decorations.
 * @param head - Caret position, or null for a range selection.
 * @returns Finding decoration under the caret, or undefined.
 */
export function findCaretIssue(issues: DecorationSet, head: number | null): Decoration | undefined {
  return head === null ? undefined : issues.find(head, head)[0];
}
