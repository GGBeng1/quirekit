import type {
  QuireLayoutDirtyRange,
  QuireLayoutTextEditHint
} from "../../../invalidation";
import type { QuireTextblockTailTextEditHint } from "./tail";

/**
 * Resolves textblock-local text-edit metadata from a document dirty range.
 *
 * The document range is the authority; this projection only narrows it to the
 * textblock's own content interval and rebases the offset to block-local space
 * so retained-tail reuse can trust the hint without re-deriving it.
 *
 * @param dirtyRange - Dirty range derived from the triggering transactions.
 * @param contentStart - Absolute document position at the textblock content start.
 * @param contentEnd - Absolute document position at the textblock content end.
 * @returns Textblock-local text edit, or undefined when the hint targets another block.
 */
export function resolveTextblockDirtyTextEdit(
  dirtyRange: QuireLayoutDirtyRange | null | undefined,
  contentStart: number,
  contentEnd: number
): QuireTextblockTailTextEditHint | undefined {
  const textEdit = resolveDirtyRangeTextEdit(dirtyRange);
  if (
    textEdit === undefined ||
    textEdit.from < contentStart ||
    textEdit.from > contentEnd
  ) {
    return undefined;
  }

  return {
    offset: Math.max(0, Math.min(textEdit.from - contentStart, contentEnd - contentStart)),
    inserted: textEdit.inserted,
    deleted: textEdit.deleted
  };
}

/**
 * Reads a precise text-edit hint from a content dirty range.
 *
 * @param dirtyRange - Dirty range to inspect.
 * @returns Text-edit hint, or undefined.
 */
function resolveDirtyRangeTextEdit(
  dirtyRange: QuireLayoutDirtyRange | null | undefined
): QuireLayoutTextEditHint | undefined {
  if (
    dirtyRange === null ||
    dirtyRange === undefined ||
    dirtyRange.reason !== "content"
  ) {
    return undefined;
  }

  return dirtyRange.textEdit;
}

/**
 * Resolves a textblock-local dirty offset from a document dirty range.
 *
 * The transaction mapping already tells us the earliest changed document
 * position in the final document. Long paragraph tail input can use that as the
 * local edit anchor instead of scanning the unchanged prefix from the block
 * start on every repeat event.
 *
 * @param dirtyRange - Dirty range derived from the triggering transactions.
 * @param contentStart - Absolute document position at the textblock content start.
 * @param contentEnd - Absolute document position at the textblock content end.
 * @returns Text offset inside the block, or undefined when the dirty range does not target it.
 */
export function resolveTextblockDirtyTextOffset(
  dirtyRange: QuireLayoutDirtyRange | null | undefined,
  contentStart: number,
  contentEnd: number
): number | undefined {
  if (
    dirtyRange === null ||
    dirtyRange === undefined ||
    dirtyRange.reason !== "content" ||
    dirtyRange.changedRange.from > contentEnd ||
    dirtyRange.changedRange.to < contentStart
  ) {
    return undefined;
  }

  return Math.max(
    0,
    Math.min(dirtyRange.changedRange.from - contentStart, contentEnd - contentStart)
  );
}
