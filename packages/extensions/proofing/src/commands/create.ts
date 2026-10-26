import { setQuireTransactionRenderImpact, type CommandProps, type RawCommands } from "@quirekit/core";
import { findIssueDecoration, readDecorationIssue } from "../plugin/issues";
import { getProofingPluginState, proofingPluginKey } from "../plugin/state";
import type { ProofingMeta } from "../plugin/types";
import { replaceProofingText } from "./replace";

/**
 * Creates a command that only records proofing metadata.
 *
 * @param meta - Metadata to record.
 * @returns Command handler kept out of history.
 */
function recordMeta(meta: ProofingMeta) {
  return ({ state, tr, dispatch }: CommandProps) => {
    if (getProofingPluginState(state) === undefined) return false;
    if (dispatch) {
      setQuireTransactionRenderImpact(tr.setMeta(proofingPluginKey, meta).setMeta("addToHistory", false), { kind: "presentation-only" });
    }
    return true;
  };
}

/**
 * Creates the Proofing command set.
 *
 * Only `replaceProofingIssue` edits the document, as one undoable step; every
 * other command changes presentation state outside history.
 *
 * @returns Raw command factories.
 */
export function createProofingCommands(): Pick<RawCommands,
  | "setProofingEnabled"
  | "recheckProofing"
  | "replaceProofingIssue"
  | "ignoreProofingIssue"
  | "ignoreProofingWord"
  | "addProofingWord"
> {
  return {
    setProofingEnabled: (enabled: boolean) => recordMeta({ type: "enable", enabled }),
    recheckProofing: () => recordMeta({ type: "recheck" }),
    replaceProofingIssue: (issueId: string, replacement: string) => ({ editor, state, tr, dispatch }: CommandProps) => {
      const value = getProofingPluginState(state);
      const decoration = value === undefined ? undefined : findIssueDecoration(value.issues, issueId);
      if (!editor.isEditable || decoration === undefined) return false;
      const issue = readDecorationIssue(decoration);
      if (!dispatch) return state.doc.textBetween(issue.from, issue.to) === issue.text;
      return replaceProofingText(tr, issue, replacement);
    },
    ignoreProofingIssue: (issueId: string) => recordMeta({ type: "ignore-issue", id: issueId }),
    ignoreProofingWord: (word: string) => recordMeta({ type: "ignore-word", word }),
    addProofingWord: (word: string) => recordMeta({ type: "add-word", word })
  };
}
