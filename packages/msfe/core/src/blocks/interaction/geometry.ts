import type { EditorView } from "@quirekit/cm-view";
import type { SourceBlock } from "../types";
import type { SourceBlockGeometry, SourceBlockRect } from "./types";

/**
 * Reads native wrappers along one ancestor chain; widgets and paragraphs share this path.
 * @param view - Canonical mounted view.
 * @param block - Accepted source block.
 * @returns Its existing DOM bounds, or null when virtualized away.
 */
export function sourceBlockRect(view: EditorView, block: SourceBlock): SourceBlockRect | null {
  return sourceBlockGeometry(view, block, false)?.rect ?? null;
}

/**
 * Measures one native ancestor path without changing selection or drop geometry.
 * @param view - Canonical mounted view.
 * @param block - Accepted source block.
 * @param includeFirstLine - Read the first row only for controls, not drop targets.
 * @returns Passive client-space bounds, or null when virtualized away.
 */
export function sourceBlockGeometry(view: EditorView, block: Pick<SourceBlock, "from" | "to">, includeFirstLine = true): SourceBlockGeometry | null {
  // A fully empty document has a native editable row but no character ranges.
  const empty = view.state.doc.length === 0 && block.from === 0 && block.to === 0;
  if (!empty && !view.visibleRanges.some(range => range.from <= block.to && range.to >= block.from)) return null;
  const start = view.domAtPos(block.from, 1), end = view.domAtPos(block.to, -1);
  let element = start.node.nodeType === 1 ? start.node as HTMLElement : start.node.parentElement;
  let owner: HTMLElement | null = null, line: HTMLElement | null = null;
  // Choose the largest existing wrapper owning exactly this source block. This
  // supports extension wrappers without hard-coded plugin selectors or new DOM.
  while (element && element !== view.contentDOM) {
    if (includeFirstLine && !line && element.classList.contains("cm-line")) line = element;
    if (element.contains(end.node)) {
      const from = view.posAtDOM(element, 0), to = view.posAtDOM(element, element.childNodes.length);
      // Native block wrappers also own their terminating line break, while the
      // exact Markdown payload stops before it. Both denote the same block.
      if (from === block.from && to >= block.to && to <= block.to + 1) owner = element;
    }
    element = element.parentElement;
  }
  const bounds = owner?.getBoundingClientRect();
  let rect: SourceBlockRect | null = bounds && bounds.height > 0
    ? { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height } : null;
  if (!rect) {
    const first = view.coordsAtPos(block.from, 1), last = view.coordsAtPos(block.to, -1), content = (line ?? view.contentDOM).getBoundingClientRect();
    rect = first && last ? { left: content.left, top: first.top, width: content.width, height: last.bottom - first.top } : null;
  }
  // Wrapped text retains the complete block rect above. Only the control anchor
  // uses one computed line height; opaque widgets keep their existing top edge.
  return rect ? { rect, firstLine: line ? firstLineRect(view, line) : null } : null;
}

/** @param view - Canonical native view. @param line - First existing CM line. @returns Its first visual row, excluding later soft wraps. */
function firstLineRect(view: EditorView, line: HTMLElement): SourceBlockRect | null {
  const rect = line.getBoundingClientRect();
  if (rect.height <= 0) return null;
  const lineHeight = Number.parseFloat(view.dom.ownerDocument.defaultView!.getComputedStyle(line).lineHeight) || view.defaultLineHeight;
  return { left: rect.left, top: rect.top, width: rect.width, height: Math.min(rect.height, lineHeight) };
}

/** @param view - Canonical native hit testing. @param x - Client x. @param y - Client y. @returns A logical hit clamped to the body's horizontal bounds. */
export function sourcePositionAtPointer(view: EditorView, x: number, y: number): number | null {
  const rect = view.contentDOM.getBoundingClientRect();
  if (y < rect.top || y > rect.bottom || x < rect.left - 88 || x > rect.right + 8) return null;
  return view.posAtCoords({ x: Math.min(rect.right - 2, Math.max(rect.left + 2, x)), y }, false);
}
