import type { Node as PMNode } from "@quirekit/pm";
import { minMax } from "../utilities/minMax";

/** Minimal view contract required to resolve positions to coordinates. */
export interface QuirePositionCoordinateView {
  /** Current editor state containing the document. */
  readonly state: {
    /** Current ProseMirror document. */
    readonly doc: PMNode;
  };
  /**
   * Resolves document position to viewport coordinates.
   *
   * @param pos - Document position.
   * @param side - Optional side bias.
   * @returns Rectangle-like position coordinates.
   */
  coordsAtPos(pos: number, side?: number): { left: number; right: number; top: number; bottom: number };
}

/**
 * Converts a document position range into a DOMRect-like object.
 *
 * @param view - View that can resolve coordinates for document positions.
 * @param from - Start position.
 * @param to - End position.
 * @returns DOMRect-like object spanning the range coordinates.
 */
export function posToDOMRect(
  view: QuirePositionCoordinateView,
  from: number,
  to: number
): DOMRect {
  const minPos = 0;
  const maxPos = view.state.doc.content.size;
  const resolvedFrom = minMax(from, minPos, maxPos);
  const resolvedEnd = minMax(to, minPos, maxPos);
  const start = view.coordsAtPos(resolvedFrom);
  const end = view.coordsAtPos(resolvedEnd, -1);
  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);
  const data = {
    top,
    bottom,
    left,
    right,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top
  };

  return {
    ...data,
    toJSON: () => data
  } as DOMRect;
}
