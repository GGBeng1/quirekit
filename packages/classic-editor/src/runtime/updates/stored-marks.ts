import type { QuireEditor } from "@quirekit/core";

/**
 * Detects caret-format changes that produce neither update nor selectionUpdate.
 *
 * Null means inherited marks while an empty set explicitly clears them, so those
 * states differ even though neither contains a mark. Document/selection changes
 * already have a synchronous projection owner and must not be projected twice.
 *
 * @param previous - Previously accepted state of this mounted editor.
 * @param current - Newly accepted state, including appended transactions.
 * @returns Whether the transaction listener must refresh the product state.
 */
export function needsClassicEditorStoredMarkProjection(
  previous: QuireEditor["state"]["pm"] | undefined,
  current: QuireEditor["state"]["pm"]
): boolean {
  if (!previous || !previous.selection.eq(current.selection)) return false;
  if (previous.storedMarks === current.storedMarks) return false;
  const before = previous.storedMarks;
  const after = current.storedMarks;
  const changed = before === null || after === null || before.length !== after.length
    || before.some((mark, index) => !mark.eq(after[index]!));
  // Empty-range mark removal can allocate an equal document. Match Core's
  // semantic update gate only after cheaper selection/mark checks have failed.
  return changed && previous.doc.eq(current.doc);
}
