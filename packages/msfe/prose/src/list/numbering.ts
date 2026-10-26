import { WidgetType, type EditorView } from "@quirekit/cm-view";
import { syntaxTree } from "@quirekit/cm-language";
import type { EditorState } from "@quirekit/cm-state";
import type { SyntaxNode, Tree } from "@lezer/common";

const indexes = new WeakMap<Tree, Map<number, ReadonlyMap<number, number>>>();

/**
 * Numbers siblings once per accepted tree; selection changes reuse this small derived index.
 * @param state - Canonical source. @param marker - Confirmed ordered-list marker.
 * @returns CommonMark ordinal starting at the first author's number.
 */
export function orderedListNumber(state: EditorState, marker: SyntaxNode): number | undefined {
  const list = marker.parent?.parent;
  if (list?.name !== "OrderedList") return undefined;
  const tree = syntaxTree(state);
  let lists = indexes.get(tree);
  if (!lists) { lists = new Map(); indexes.set(tree, lists); }
  let numbers = lists.get(list.from);
  if (!numbers) {
    const result = new Map<number, number>();
    let number: number | undefined;
    for (let item = list.firstChild; item; item = item.nextSibling) {
      const mark = item.name === "ListItem" ? item.getChild("ListMark") : null;
      if (!mark) continue;
      number ??= parseInt(state.sliceDoc(mark.from, mark.to), 10);
      result.set(mark.from, number++);
    }
    lists.set(list.from, numbers = result);
  }
  return numbers.get(marker.from);
}

/** A reading-only marker mapped to the author's original source characters. */
export class OrderedMarker extends WidgetType {
  /** @param number - Semantic ordinal, never written to Markdown. */
  constructor(readonly number: number) { super(); }
  /** @param other - Previous marker. @returns Whether the reading text is unchanged. */
  eq(other: OrderedMarker): boolean { return other.number === this.number; }
  /** @param view - Native owner. @returns Reading marker with the public list geometry. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span"); span.className = "msfe-list-prefix msfe-list-number";
    span.textContent = `${this.number}. `; return span;
  }
  /** @returns Native selection remains with CM. */
  ignoreEvent(): boolean { return false; }
}
