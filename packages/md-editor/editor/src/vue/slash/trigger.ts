import { Prec } from "@quirekit/cm-state";
import { EditorView, ViewPlugin, type ViewUpdate } from "@quirekit/cm-view";
import { Extension } from "@quirekit/msfe-core";
import { mdSlashQuery } from "./query";
import type { MdSlashController, MdSlashOptions } from "./types";

/** @param options - Product-owned menu and native keyboard bridge. @returns A bounded input observer with explicit dismissal and teardown. */
export function createMdSlashTrigger(options: MdSlashOptions): MdSlashController {
  let active = false, visible = false, generation = 0;
  /** Ends the current query without altering source or editor focus. */
  function dismiss(): void {
    active = false; generation++;
    if (visible) { visible = false; options.change(null); }
  }
  const extension = Extension.create({
    name: "md-slash-insertion",
    /** @returns Native events and geometry observers, resolving the editor only after initialization. */
    addCodeMirrorExtensions() {
      /** @param view - Native view owning the accepted source and coordinate space. */
      const measure = (view: EditorView): void => {
        if (!active || view.composing) return;
        const match = mdSlashQuery(view.state);
        if (!match || !options.enabled() || !view.hasFocus) { dismiss(); return; }
        const state = view.state, ticket = ++generation, editor = this.editor, scope = editor.documentScope;
        /** @returns Whether the captured query still belongs to the active input session. */
        const current = (): boolean => !scope.disposed && ticket === generation && state === view.state && active && !view.compositionStarted;
        view.requestMeasure({ key: options,
          // A cancelled read must not ask the native view for a position from an older document.
          read: owner => current() && owner.hasFocus && options.enabled() ? owner.coordsAtPos(match.block.from) : null,
          write: rect => {
            if (!current()) return;
            if (!rect || !view.hasFocus || !options.enabled()) { dismiss(); return; }
            visible = true;
            options.change({ query: match.query, input: view.contentDOM, controls: {
              editor, block: match.block, target: editor.captureTarget(),
              rect: { left: rect.left, top: rect.top, width: 0, height: rect.bottom - rect.top },
            } });
          },
        });
      };
      return [Prec.highest(EditorView.domEventHandlers({
        keydown: (event, view) => {
          if (!active || !options.enabled() || view.composing || event.isComposing || event.keyCode === 229) return false;
          if (event.key === "Escape") { dismiss(); event.preventDefault(); return true; }
          if (visible && options.keydown(event)) return true;
          // Modified Enter, Tab and cursor navigation resume their native semantics.
          if (["Enter", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) dismiss();
          return false;
        },
        compositionstart: () => {
          generation++;
          if (visible) { visible = false; options.change(null); }
          return false;
        },
        compositionend: (_event, view) => { queueMicrotask(() => { if (active) measure(view); }); return false; },
        scroll: (_event, view) => { if (active) measure(view); return false; },
      })), ViewPlugin.define(() => ({
        /** @param update - Accepted native transaction or viewport/focus update. */
        update(update: ViewUpdate) {
          if (update.view.composing) return;
          const typing = update.docChanged && update.transactions.some(transaction => transaction.isUserEvent("input.type"));
          if (!active && !typing) return;
          // Deleting a live query continues the same interaction. Paste, undo and
          // external source changes never create or revive a menu session.
          const deleting = active && update.docChanged && update.transactions.some(transaction => transaction.isUserEvent("delete"));
          if (!options.enabled() || !update.view.hasFocus || update.docChanged && !typing && !deleting) { dismiss(); return; }
          if (update.docChanged || update.selectionSet) active = !!mdSlashQuery(update.state);
          if (!active) { dismiss(); return; }
          measure(update.view);
        },
        /** Retires queued measurements and host UI when this view unmounts. */
        destroy() { dismiss(); },
      }))];
    },
  });
  return { extension, dismiss };
}
