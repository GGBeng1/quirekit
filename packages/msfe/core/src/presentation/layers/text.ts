import { WidgetType, type EditorView } from "@quirekit/cm-view";

/** A mapped text fragment such as a normalized line break; never a second input surface. */
export class ProjectionText extends WidgetType {
  /** @param text - Source-derived literal text. */
  constructor(private readonly text: string) { super(); }
  /** @param other - Previous fragment. @returns Whether the DOM can be reused. */
  eq(other: ProjectionText): boolean { return this.text === other.text; }
  /** @param view - Canonical DOM owner. @returns Text-only inline presentation. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span"); span.textContent = this.text; return span;
  }
  /** @returns Selection remains owned by CodeMirror. */
  ignoreEvent(): boolean { return false; }
}
