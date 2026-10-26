import type { QuireEditor } from "@quirekit/core";
import type { ProofingRange } from "../types";

/**
 * Resolves the document interval visible in the browser window.
 *
 * Probes the vertical middle line of the mounted view at the top and bottom of
 * its visible part. Headless editors and views that cannot map coordinates
 * report null, which keeps the plain visit order.
 *
 * @param editor - Editor owning the mounted view.
 * @returns Visible interval, or null when unknown.
 */
export function resolveDefaultProofingVisibleRange(editor: QuireEditor): ProofingRange | null {
  try {
    const view = editor.view;
    const element = view.dom as HTMLElement;
    const rect = element.getBoundingClientRect();
    const height = element.ownerDocument.defaultView?.innerHeight ?? 0;
    const top = Math.max(rect.top, 0);
    const bottom = Math.min(rect.bottom, height);
    if (bottom <= top) return null;
    const left = rect.left + rect.width / 2;
    const start = view.posAtCoords({ left, top: top + 1 });
    const end = view.posAtCoords({ left, top: bottom - 1 });
    if (start === null || end === null) return null;
    return { from: Math.min(start.pos, end.pos), to: Math.max(start.pos, end.pos) + 1 };
  } catch {
    return null;
  }
}
