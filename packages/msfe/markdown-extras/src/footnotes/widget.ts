import { WidgetType, type EditorView } from "@quirekit/cm-view";

/** Generated numbering occupies the source marker's interval and never enters Markdown. */
export class FootnoteNumber extends WidgetType {
  /** @param number - Shared first-reference number. @param kind - Navigation destination. @param label - Host-localized accessible action. */
  constructor(readonly number: number, readonly kind: "reference" | "definition", readonly label: string) { super(); }
  /** @param other - Retained marker. @returns Whether visible and accessible semantics are unchanged. */
  eq(other: FootnoteNumber): boolean { return this.number === other.number && this.kind === other.kind && this.label === other.label; }
  /** @param view - Canonical owner. @returns A keyboard-accessible semantic link with no independent button skin. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.className = this.kind === "reference" ? "msfe-footnote-reference" : "msfe-footnote-backlink";
    span.dataset.msfeFootnote = this.kind; span.textContent = this.kind === "reference" ? String(this.number) : `[${this.number}] ↩`;
    span.setAttribute("role", "link"); span.setAttribute("aria-label", this.label); span.title = this.label; span.tabIndex = 0;
    return span;
  }
  /** @returns Native selection and the feature's contextual navigation receive events. */
  ignoreEvent(): boolean { return false; }
}
