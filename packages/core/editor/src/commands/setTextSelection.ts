import { TextSelection } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import type { QuireRange } from "../types";
import { minMax } from "../utilities";
import { resolvePosition } from "./position";

/**
 * Creates a text selection.
 *
 * @param context - Current command execution context.
 * @param position - Selection position or range.
 * @returns Whether the selection was set.
 */
export const setTextSelection: CommandSpec = (position) => (context) => {
  const range = resolvePosition(position, context.tr.selection.from);

  const directSelection = createDirectTextSelection(context.tr.doc, range);
  if (directSelection !== null) {
    context.dispatch?.(context.tr.setSelection(directSelection));
    return true;
  }

  const min = TextSelection.atStart(context.tr.doc).from;
  const max = TextSelection.atEnd(context.tr.doc).to;
  const from = minMax(range.from, min, max);
  const to = minMax(range.to, min, max);

  context.dispatch?.(
    context.tr.setSelection(TextSelection.create(context.tr.doc, from, to))
  );
  return true;
};

/**
 * Creates a text selection when the requested range is already valid.
 *
 * The common command path targets a known text position from the view or caller.
 * Avoiding global `atStart` / `atEnd` boundary discovery keeps that hot path
 * local in very large documents. Invalid or out-of-bounds ranges still fall back
 * to the legacy clamped path above.
 *
 * @param doc - ProseMirror document to select in.
 * @param range - Requested selection range.
 * @returns Text selection, or null when the range needs fallback normalization.
 */
function createDirectTextSelection(
  doc: Parameters<typeof TextSelection.create>[0],
  range: QuireRange
): TextSelection | null {
  if (
    range.from < 0 ||
    range.to < 0 ||
    range.from > doc.content.size ||
    range.to > doc.content.size
  ) {
    return null;
  }

  try {
    return TextSelection.create(doc, range.from, range.to);
  } catch {
    return null;
  }
}
