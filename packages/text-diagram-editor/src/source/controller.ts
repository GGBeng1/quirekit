import { isolateHistory } from "@quirekit/cm-commands";
import { closeSearchPanel, openSearchPanel } from "@quirekit/cm-search";
import { Compartment, EditorState, Transaction } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import type { TextDiagramLanguage } from "@quirekit/text-diagram";
import { diagramSourceConfiguration, diagramSourceExtensions, externalSource, sourceLimitExceeded, sourceLineBreak } from "./extensions";
import { diagramSourceLanguages } from "./language";
import type { DiagramSourceEditor, DiagramSourceOptions, DiagramSourceValue } from "./types";

/** @param left - Previous interface state. @param right - Next interface state. @returns Whether a compartment update is actually needed. */
function configurationChanged(left: DiagramSourceValue, right: DiagramSourceValue): boolean {
  return left.disabled !== right.disabled || left.locale !== right.locale || left.label !== right.label
    || left.id !== right.id || left.describedBy !== right.describedBy || left.invalid !== right.invalid;
}

/**
 * Owns one view and at most three independent source histories for a modal lifetime.
 * @param options - Explicit mount owner, controlled value and change callbacks.
 * @returns Stable component controller with idempotent disposal.
 */
export function createDiagramSourceEditor(options: DiagramSourceOptions): DiagramSourceEditor {
  let current = options.value, destroyed = false;
  const configuration = new Compartment(), states = new Map<TextDiagramLanguage, EditorState>();
  const listener = EditorView.updateListener.of(update => {
    for (const transaction of update.transactions) {
      for (const effect of transaction.effects) if (effect.is(sourceLimitExceeded)) options.onLimit(effect.value);
    }
    if (!update.docChanged) return;
    options.onLimit(false);
    if (update.transactions.every(transaction => !transaction.docChanged || transaction.annotation(externalSource))) return;
    // Selection, focus and viewport updates never serialize the source or notify Vue.
    current = { ...current, source: update.state.doc.sliceString(0, undefined, update.state.facet(sourceLineBreak)) };
    options.onChange(current.source);
  });
  /** @param value - First draft for a grammar. @returns State with its own parse tree, selection and undo stack. */
  function createState(value: DiagramSourceValue): EditorState {
    return EditorState.create({ doc: value.source, extensions: [diagramSourceExtensions, diagramSourceLanguages[value.language],
      sourceLineBreak.of(/\r\n|\n|\r/u.exec(value.source)?.[0] ?? "\n"),
      configuration.of(diagramSourceConfiguration(value)), listener] });
  }
  const view = new EditorView({ parent: options.parent, state: createState(current) });
  return {
    view,
    /** @param value - Latest Vue state; local echoes are ignored before dispatch. */
    sync(value) {
      if (destroyed) return;
      const switched = value.language !== current.language;
      const configure = switched || configurationChanged(current, value);
      if (switched) {
        states.set(current.language, view.state);
        view.setState(states.get(value.language) ?? createState(value));
        options.onLimit(false);
      }
      // Explicit templates are one undoable edit. The identity guard prevents prop echoes
      // from rewriting the document or disturbing a native composition's DOM selection.
      if ((switched || value.source !== current.source) && !view.state.doc.eq(view.state.toText(value.source))) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value.source },
          annotations: [externalSource.of(true), Transaction.userEvent.of("input.template"), isolateHistory.of("full")] });
      }
      current = value;
      if (configure) view.dispatch({ effects: configuration.reconfigure(diagramSourceConfiguration(value)) });
    },
    /** Opens search within this editor's scope. */
    search() { if (!destroyed) openSearchPanel(view); },
    /** @param event - Containing modal's public Escape notification, before its default dismiss action. */
    handleEscape(event) {
      if (destroyed || event.key !== "Escape" || event.defaultPrevented || !view.dom.contains(event.target as Node | null)) return;
      event.preventDefault();
      if (event.isComposing || view.composing) return;
      // Modal capture runs before CM's keymap. Perform the two public CM actions
      // here so cancellation neither closes the draft nor traps keyboard focus.
      closeSearchPanel(view); view.setTabFocusMode(2000);
    },
    /** Releases DOM listeners and cached histories even after repeated cancellation. */
    destroy() { if (destroyed) return; destroyed = true; states.clear(); view.destroy(); view.dom.remove(); },
  };
}
