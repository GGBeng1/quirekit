import type { EditorView, Rect } from "@quirekit/cm-view";

/**
 * Measures an explicitly declared, zero-length source slot rather than widget chrome.
 * @param view - Canonical source/DOM mapping authority.
 * @param pos - Exact empty source position.
 * @param dom - Already resolved native DOM endpoint.
 * @param side - One adjacent DOM child; no subtree or document scan.
 * @returns The slot's native text caret, or null for ordinary replacement buffers.
 */
export function sourceSlotCaret(view: EditorView, pos: number, dom: ReturnType<EditorView["domAtPos"]>, side: -1 | 1): Rect | null {
  const slot = dom.node.childNodes[dom.offset + (side < 0 ? -1 : 0)];
  if (slot?.nodeType !== 1 || !(slot as Element).hasAttribute("data-msfe-caret-slot") || view.posAtDOM(slot) !== pos) return null;
  const text = slot.firstChild;
  if (text?.nodeType !== 3 || text.nextSibling || text.textContent !== "\u200b") return null;
  // The slot is display-only. A native range on its zero-width text preserves
  // font, alignment and scaling without inventing a caret from the cell's box.
  const range = slot.ownerDocument!.createRange(); range.selectNodeContents(text);
  const rect = range.getBoundingClientRect();
  return rect.height >= 1 ? { left: rect.left, right: rect.left, top: rect.top, bottom: rect.bottom } : null;
}
