import type { EditorView } from "@quirekit/cm-view";
import type { SourceBlock } from "../types";
import { sourceBlockAt, sourceBlockSibling, sameSourceBlockScope } from "../query";
import { sourceBlockRect, sourcePositionAtPointer } from "./geometry";
import type { SourceBlockDrop } from "./types";

/** @param view - Native source owner. @param source - Frozen source block. @param x - Client x. @param y - Client y. @returns A real same-flow insertion boundary, never a descendant or placeholder. */
export function blockDropAt(view: EditorView, source: SourceBlock, x: number, y: number): SourceBlockDrop | null {
  const position = sourcePositionAtPointer(view, x, y);
  if (position === null) return null;
  const line = view.state.doc.lineAt(position);
  // Blank separator lines have no block node. Inspect only their immediate
  // boundaries so the visible inter-block gap remains a useful drop target.
  const block = sourceBlockAt(view.state, position, source.scope) ?? (!line.text.trim()
    ? sourceBlockAt(view.state, Math.max(0, line.from - 1), source.scope)
      ?? sourceBlockAt(view.state, Math.min(view.state.doc.length, line.to + 1), source.scope) : null);
  if (!block || !sameSourceBlockScope(source, block)) return null;
  const rect = sourceBlockRect(view, block);
  if (!rect) return null;
  const side = y < rect.top + rect.height / 2 ? "before" : "after";
  if (source.from === block.from || sourceBlockSibling(view.state, source, side === "before" ? 1 : -1)?.from === block.from) return null;
  return { block, side, rect: { ...rect, top: side === "before" ? rect.top : rect.top + rect.height, height: 2 } };
}

/** @param view - Native editor and scroll ancestors. @param clientY - Pointer position. @returns Whether a real scroll container moved. */
export function scrollBlockDrag(view: EditorView, clientY: number): boolean {
  const win = view.dom.ownerDocument.defaultView!;
  for (let element: HTMLElement | null = view.scrollDOM; element; element = element.parentElement) {
    const page = element === view.dom.ownerDocument.scrollingElement;
    if (!page && (element.scrollHeight <= element.clientHeight || !/(auto|scroll)/u.test(win.getComputedStyle(element).overflowY))) continue;
    const rect = page ? { top: 0, bottom: win.innerHeight } : element.getBoundingClientRect();
    const delta = clientY < rect.top + 48 ? -Math.ceil((rect.top + 48 - clientY) / 4)
      : clientY > rect.bottom - 48 ? Math.ceil((clientY - rect.bottom + 48) / 4) : 0;
    const before = element.scrollTop;
    if (delta) element.scrollTop += Math.max(-24, Math.min(24, delta));
    if (element.scrollTop !== before) return true;
  }
  return false;
}
