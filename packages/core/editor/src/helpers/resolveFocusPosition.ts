import {
  Selection,
  TextSelection,
  type Node as PMNode
} from "@quirekit/pm";
import type { QuireFocusPosition } from "../types";
import { minMax } from "../utilities/minMax";

/**
 * Resolves a Tiptap-compatible focus position into a ProseMirror selection.
 *
 * @param doc - Document where the selection should be resolved.
 * @param position - Focus position option.
 * @returns Resolved selection, or null when no explicit focus position exists.
 */
export function resolveFocusPosition(
  doc: PMNode,
  position: QuireFocusPosition = null
): Selection | null {
  if (!position) {
    return null;
  }

  const selectionAtStart = Selection.atStart(doc);
  const selectionAtEnd = Selection.atEnd(doc);

  if (position === "start" || position === true) {
    return selectionAtStart;
  }

  if (position === "end") {
    return selectionAtEnd;
  }

  const minPos = selectionAtStart.from;
  const maxPos = selectionAtEnd.to;

  if (position === "all") {
    return TextSelection.create(
      doc,
      minMax(0, minPos, maxPos),
      minMax(doc.content.size, minPos, maxPos)
    );
  }

  return TextSelection.create(
    doc,
    minMax(position, minPos, maxPos),
    minMax(position, minPos, maxPos)
  );
}
