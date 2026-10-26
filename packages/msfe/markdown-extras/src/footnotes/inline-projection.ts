import { Decoration, WidgetType, type EditorView } from "@quirekit/cm-view";
import type { ProjectionContext } from "@quirekit/msfe-core";
import { queryFootnotes } from "./query";

/** Generated inline-note prefix; its editable body remains in the native source flow. */
class InlineNumber extends WidgetType {
  /** @param number - Shared first-use ordinal. */
  constructor(readonly number: number) { super(); }
  /** @param other - Existing prefix. @returns Whether visible content is unchanged. */
  eq(other: InlineNumber): boolean { return this.number === other.number; }
  /** @param view - Canonical owner. @returns A plain text prefix with no independent input or navigation state. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.className = "msfe-inline-footnote-number"; span.textContent = `[${this.number}: `; return span;
  }
  /** @returns Native pointer selection remains available. */
  ignoreEvent(): boolean { return false; }
}

/** @param input - Confirmed inline note. @returns Readable source-position content and shared numbering, without duplicated footnote text. */
export function projectInlineFootnote({ state, node, active, from, to }: ProjectionContext) {
  const number = queryFootnotes(state).inline.get(node.from);
  if (active || number === undefined) return [];
  const start = Math.max(from, node.from), end = Math.min(to, node.to);
  const result = start < end ? [Decoration.mark({ class: "msfe-inline-footnote", attributes: { role: "note" } }).range(start, end)] : [];
  if (node.from >= from && node.from + 2 <= to) result.push(Decoration.replace({ widget: new InlineNumber(number) }).range(node.from, node.from + 2));
  return result;
}
