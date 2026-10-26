import { TextSelection, type EditorState, type Transaction } from "@quirekit/pm";
import { resolveSearchScope } from "../match/scan";
import { getSearchPluginState, searchPluginKey } from "../plugin/state";
import type {
  SearchHost,
  SearchMatch,
  SearchMeta,
  SearchReplaceAllResult
} from "../types";
import { activateSearchMatch, locateAdjacentMatch } from "./navigate";
import type { SearchReplaceabilityCheck } from "./verdict";

/**
 * Replaces one match range with plain text carrying the first matched character's marks.
 *
 * An empty replacement uses a plain delete so a fully matched paragraph keeps its node.
 *
 * @param tr - Transaction whose document contains `match`.
 * @param match - Range to replace.
 * @param text - Replacement text.
 */
export function replaceMatchRange(tr: Transaction, match: SearchMatch, text: string): void {
  if (text.length === 0) {
    tr.delete(match.from, match.to);
    return;
  }
  const marks = tr.doc.nodeAt(match.from)?.marks ?? [];
  tr.replaceWith(match.from, match.to, tr.doc.type.schema.text(text, marks));
}

/**
 * Replaces the active match when it is selected, then activates the following match.
 *
 * @param state - Editor state before replacement.
 * @param tr - Transaction to extend.
 * @param host - Host hooks.
 * @param text - Replacement text.
 * @param check - Replaceability decision.
 * @returns False when nothing is active and selected or the match may not be replaced.
 */
export function replaceActiveMatch(
  state: EditorState,
  tr: Transaction,
  host: SearchHost,
  text: string,
  check: SearchReplaceabilityCheck
): boolean {
  const { active, matches } = getSearchPluginState(state);
  if (active === null || state.selection.from !== active.from || state.selection.to !== active.to) {
    return false;
  }
  if (!check(active).replaceable) return false;

  const remaining = matches.filter((match) => match.from !== active.from);
  const following = locateAdjacentMatch(
    remaining,
    resolveSearchScope(host, state),
    active.from,
    active.to,
    "next"
  );
  replaceMatchRange(tr, active, text);
  if (following === null) {
    tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(active.to)));
    tr.setMeta(searchPluginKey, { type: "activate", match: null } satisfies SearchMeta);
    return true;
  }
  activateSearchMatch(tr, {
    ...following,
    from: tr.mapping.map(following.from, 1),
    to: tr.mapping.map(following.to, -1)
  }, host);
  return true;
}

/**
 * Replaces every host-approved match in one transaction.
 *
 * Matches are replaced in descending document order so earlier positions stay
 * valid without mapping; a rejected match never aborts the others.
 *
 * @param state - Editor state before replacement.
 * @param tr - Transaction to extend.
 * @param text - Replacement text.
 * @param check - Replaceability decision.
 * @returns Replacement outcome.
 */
export function replaceAllMatches(
  state: EditorState,
  tr: Transaction,
  text: string,
  check: SearchReplaceabilityCheck
): SearchReplaceAllResult {
  const { matches } = getSearchPluginState(state);
  const skippedByReason: Record<string, number> = {};
  const approved: SearchMatch[] = [];
  for (const match of matches) {
    const verdict = check(match);
    if (verdict.replaceable) {
      approved.push(match);
    } else {
      skippedByReason[verdict.reason] = (skippedByReason[verdict.reason] ?? 0) + 1;
    }
  }
  approved.sort((left, right) => right.from - left.from);
  for (const match of approved) replaceMatchRange(tr, match, text);
  const result: SearchReplaceAllResult = {
    replaced: approved.length,
    skipped: matches.length - approved.length,
    total: matches.length,
    skippedByReason
  };
  tr.setMeta(searchPluginKey, { type: "replaced-all", result } satisfies SearchMeta);
  return result;
}
