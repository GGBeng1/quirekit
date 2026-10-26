import { StateEffect, StateField } from "@quirekit/cm-state";
import { Decoration, EditorView, WidgetType } from "@quirekit/cm-view";
import type { SourceProxyState } from "./types";

/** Source-independent metadata; every update explicitly stays outside history. */
export const sourceProxyEffect = StateEffect.define<Partial<SourceProxyState>>();

/** One transient widget, rendered through CM's own layout rather than a second document. */
class PreeditWidget extends WidgetType {
  /** @param text - Current uncommitted native composition. */
  constructor(private readonly text: string) { super(); }
  /** @param other - Previous transient widget. @returns Whether its text can be retained. */
  eq(other: PreeditWidget): boolean { return this.text === other.text; }
  /** @param view - Owner-document authority. @returns Inline preedit that inherits its source typography. */
  toDOM(view: EditorView): HTMLElement {
    const span = view.dom.ownerDocument.createElement("span");
    span.setAttribute("data-msfe-preedit", ""); span.className = "msfe-input-preedit";
    span.textContent = this.text || "\u200b"; return span;
  }
  /** @returns Gestures are owned by the source input adapter, including taps on preedit. */
  ignoreEvent(): boolean { return false; }
}

/** Isolated input metadata is rebuilt on source replacement and excluded from persistence. */
export const sourceProxyState = StateField.define<SourceProxyState>({
  /** @returns Fresh, inactive input metadata on each document lifetime. */
  create: () => ({ active: false, focused: false, preedit: null }),
  /** @param value - Prior transient metadata. @param transaction - Accepted source or input phase. @returns Mapped transient state with no persistence authority. */
  update(value, transaction) {
    if (transaction.docChanged && value.preedit) value = { ...value, preedit: { ...value.preedit, selection: value.preedit.selection.map(transaction.changes) } };
    for (const effect of transaction.effects) if (effect.is(sourceProxyEffect)) value = { ...value, ...effect.value };
    return value;
  },
  provide: field => EditorView.decorations.from(field, ({ preedit }) => {
    if (!preedit) return Decoration.none;
    const range = preedit.selection.main, widget = new PreeditWidget(preedit.text);
    return Decoration.set([range.empty ? Decoration.widget({ widget, side: range.assoc < 0 ? -1 : 1 }).range(range.head)
      : Decoration.replace({ widget }).range(range.from, range.to)]);
  }),
});
