import type { CommandProps } from "@quirekit/core";

/**
 * Reads the installed revision owner's session contract without a reverse package dependency.
 * The revision compiler imports style semantics; it remains the final transaction authority.
 * @param context - Current command, including the accumulated chain document.
 * @returns Whether an untrackable style operation must be refused before adding steps.
 */
export function isWordStyleRevisionTracking(context: CommandProps): boolean {
  const owner = context.editor.storage.wordRevision as {
    readonly sessionPolicy?: { readonly enabled?: boolean };
  } | undefined;
  return owner?.sessionPolicy !== undefined
    && (owner.sessionPolicy.enabled ?? context.tr.doc.attrs.wordTrackRevisions === true);
}
