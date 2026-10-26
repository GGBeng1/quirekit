import { Compartment, type Extension } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { compositionEffect, compositionField } from "../state/fields";
import type { MsfeMode } from "../state/types";
import { modeConfiguration, themeConfiguration } from "../presentation/configuration";
import type { MsfeEditorOptions } from "../editor/types";
import { captureScrollAnchor, restoreScrollAnchor, scrollAnchorEffects } from "./scroll";
import { prepareCompositionSelection } from "./composition";

/** Owns reconfiguration and composition deferral for one mounted view. */
export class Presentation {
  readonly modeSlot = new Compartment();
  readonly themeSlot = new Compartment();
  mode: MsfeMode;
  readOnly: boolean;
  theme: "light" | "dark";
  private pending: MsfeMode | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private generation = 0;
  private cancelScroll: (() => void) | undefined;

  /** @param options - Initial host settings. */
  constructor(private readonly options: MsfeEditorOptions) {
    this.mode = options.mode ?? "source";
    this.readOnly = options.readOnly ?? false;
    this.theme = options.theme ?? "light";
  }

  /** @returns Initial presentation plus composition event ownership. */
  extensions(): Extension {
    return [this.modeSlot.of(modeConfiguration(this.mode, this.readOnly, this.options)),
      this.themeSlot.of(themeConfiguration(this.theme)), EditorView.updateListener.of(update => {
        if (update.startState.field(compositionField) && !update.state.field(compositionField) && this.pending) {
          // Both native DOM composition and an isolated input host release the
          // same guard. Reconfigure only after the accepting CM update finishes.
          queueMicrotask(() => {
            if (this.disposed || update.view.state.field(compositionField)) return;
            const pending = this.pending; this.pending = undefined;
            if (pending) this.setMode(update.view, pending);
          });
        }
      }), EditorView.domEventHandlers({
        wheel: () => { this.cancelAnchor(); return false; },
        pointerdown: () => { this.cancelAnchor(); return false; },
        touchmove: () => { this.cancelAnchor(); return false; },
        compositionstart: (_event, view) => {
          if (this.timer) clearTimeout(this.timer);
          view.dispatch({ ...prepareCompositionSelection(view), effects: compositionEffect.of(true) });
          return false;
        },
        compositionend: (_event, view) => {
          // Let CodeMirror accept the final DOM input before changing the projected DOM.
          this.timer = setTimeout(() => {
            if (this.disposed) return;
            view.dispatch({ effects: compositionEffect.of(false) });
            const pending = this.pending;
            this.pending = undefined;
            if (pending) this.setMode(view, pending);
          }, 30);
          return false;
        },
      })];
  }

  /** @param view - Mounted owner. @param mode - Last requested presentation. */
  setMode(view: EditorView, mode: MsfeMode): void {
    if (view.state.field(compositionField) || view.compositionStarted) { this.pending = mode; return; }
    if (this.mode === mode) return;
    this.mode = mode;
    this.reconfigure(view);
  }

  /** @param view - Mounted owner. @param readOnly - Immediate editing permission. */
  setReadOnly(view: EditorView, readOnly: boolean): void {
    this.readOnly = readOnly;
    this.reconfigure(view);
  }

  /** @param view - Mounted owner. @param theme - Host color palette. */
  setTheme(view: EditorView, theme: "light" | "dark"): void {
    this.cancelScroll?.();
    const anchor = captureScrollAnchor(view);
    const generation = ++this.generation;
    this.theme = theme;
    view.dispatch({ effects: [this.themeSlot.reconfigure(themeConfiguration(theme)), ...scrollAnchorEffects(anchor)] });
    this.cancelScroll = restoreScrollAnchor(view, anchor, () => !this.disposed && generation === this.generation);
  }

  /** @param view - View whose source anchor must survive different line heights. */
  private reconfigure(view: EditorView): void {
    this.cancelScroll?.();
    const anchor = captureScrollAnchor(view);
    const generation = ++this.generation;
    view.dispatch({ effects: [this.modeSlot.reconfigure(modeConfiguration(this.mode, this.readOnly, this.options)), ...scrollAnchorEffects(anchor)] });
    this.cancelScroll = restoreScrollAnchor(view, anchor, () => !this.disposed && generation === this.generation);
  }

  /** A newer navigation intent supersedes an outstanding mode-restoration request. */
  cancelAnchor(): void { this.generation++; this.cancelScroll?.(); }

  /** Cancels a document-specific deferred request before an explicit document reset. */
  reset(): void { this.cancelAnchor(); this.pending = undefined; if (this.timer) clearTimeout(this.timer); }

  /** Releases pending callbacks before the view is destroyed. */
  destroy(): void { this.disposed = true; this.reset(); }
}
