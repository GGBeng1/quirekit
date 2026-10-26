import { StateEffect, StateField, type EditorSelection, type EditorState } from "@quirekit/cm-state";
import { ViewPlugin, type EditorView, type ViewUpdate } from "@quirekit/cm-view";
import { compositionEffect, compositionField } from "../state/fields";

/** Presentation metadata only; native CodeMirror continues accepting every real selection. */
export const revealSelectionEffect = StateEffect.define<EditorSelection | null>();
/** Immutable reveal selection for one primary-pointer gesture, owned by this editor state. */
export const revealSelectionField = StateField.define<EditorSelection | null>({
  create: () => null,
  update(value, transaction) {
    if (transaction.docChanged || transaction.reconfigured || transaction.effects.some(effect => effect.is(compositionEffect))) return null;
    for (const effect of transaction.effects) if (effect.is(revealSelectionEffect)) return effect.value;
    return value;
  },
});

/** @param state - Canonical state. @returns Reveal selection, with ordinary states needing no installed field. */
export function sourceRevealSelection(state: EditorState): EditorSelection {
  return state.field(revealSelectionField, false) ?? state.selection;
}

/** Keeps source reveal from changing geometry underneath CodeMirror's native mouse selection. */
class SourceRevealGesture {
  private listeners: AbortController | undefined;
  /** @param view - Mounted input and state owner. */
  constructor(private readonly view: EditorView) {}

  /** @param event - Native primary-button start. @returns False so CodeMirror owns selection and drag behavior. */
  start(event: MouseEvent): boolean {
    const { view } = this;
    if (event.button !== 0 || view.state.field(compositionField)
      || !view.contentDOM.contains(event.target as globalThis.Node | null)) return false;
    const owner = view.dom.ownerDocument.defaultView;
    if (!owner) return false;
    this.cancelListeners();
    const listeners = this.listeners = new AbortController();
    // CM handles mouseup on the document; the bubbling window listener runs after its
    // final native selection acceptance. There is no extra move handler or delayed frame.
    owner.addEventListener("mouseup", () => this.finish(), { signal: listeners.signal, once: true });
    owner.addEventListener("pointercancel", () => this.finish(), { signal: listeners.signal, once: true });
    owner.addEventListener("dragend", () => this.finish(), { signal: listeners.signal, once: true });
    owner.addEventListener("blur", () => this.finish(), { signal: listeners.signal, once: true });
    view.dispatch({ effects: revealSelectionEffect.of(view.state.selection) });
    return false;
  }

  /** Releases presentation after native acceptance, without changing source, selection or history. */
  finish(): void {
    this.cancelListeners();
    const { view } = this;
    if (view.state.field(revealSelectionField)) view.dispatch({ effects: revealSelectionEffect.of(null) });
  }

  /** @param update - Accepted document, configuration or composition cancellation. */
  update(update: ViewUpdate): void {
    if (!update.state.field(revealSelectionField)) this.cancelListeners();
  }

  /** Removes every owner-window listener after completion, cancellation or teardown. */
  private cancelListeners(): void { this.listeners?.abort(); this.listeners = undefined; }
  /** Cancels outstanding listeners without dispatching into an unmounted editor. */
  destroy(): void { this.cancelListeners(); }
}

/** One instance-local lifecycle; keyboard and programmatic selections keep immediate reveal. */
export const sourceRevealGesture = [revealSelectionField, ViewPlugin.fromClass(SourceRevealGesture, {
  eventHandlers: {
    mousedown(event) { return this.start(event); },
  },
  eventObservers: {
    // Cleanup still runs when a higher-priority keymap consumes Escape.
    keydown(event) { if (event.key === "Escape") this.finish(); },
  },
})];
