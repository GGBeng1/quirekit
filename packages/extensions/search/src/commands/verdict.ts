import type { EditorState, Plugin, Transaction } from "@quirekit/pm";
import type { SearchHost, SearchMatch, SearchReplaceVerdict } from "../types";
import { replaceMatchRange } from "./replace";

/** Decides whether one match may be replaced. */
export type SearchReplaceabilityCheck = (match: SearchMatch) => SearchReplaceVerdict;

/** Reason code for matches a transaction filter would reject. */
export const searchProtectedReason = "protected";

const replaceable: SearchReplaceVerdict = { replaceable: true };
const rejectedByFilter: SearchReplaceVerdict = { replaceable: false, reason: searchProtectedReason };

/**
 * Combines host rules with a per-match trial against the state's transaction filters.
 *
 * A filter such as document protection rejects a whole transaction when any step
 * touches a protected range, so each match is tried alone before the real
 * replacement batches the admitted ones.
 *
 * @param host - Host hooks.
 * @param state - State the command reads matches from.
 * @param committed - Real editor state with the same document, or null to skip trials.
 * @param text - Replacement text.
 * @returns Replaceability check.
 */
export function createReplaceabilityCheck(
  host: SearchHost,
  state: EditorState,
  committed: EditorState | null,
  text: string
): SearchReplaceabilityCheck {
  const filters = committed?.plugins.filter((plugin) => plugin.spec.filterTransaction !== undefined) ?? [];
  return (match) => {
    const verdict = host.checkReplaceable?.(state, match) ?? replaceable;
    if (!verdict.replaceable || committed === null || filters.length === 0) return verdict;
    const trial = committed.tr;
    replaceMatchRange(trial, match, text);
    return admitsTransaction(committed, filters, trial) ? replaceable : rejectedByFilter;
  };
}

/**
 * Runs transaction filters through the public plugin API.
 *
 * @param state - State the transaction would apply to.
 * @param filters - Plugins that declare a transaction filter.
 * @param tr - Candidate transaction.
 * @returns Whether every filter admits it.
 */
function admitsTransaction(state: EditorState, filters: readonly Plugin[], tr: Transaction): boolean {
  return filters.every((plugin) => plugin.spec.filterTransaction!.call(plugin, tr, state));
}
