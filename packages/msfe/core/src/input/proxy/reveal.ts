import { EditorSelection } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { applySourceScrollStep, sourceCaretRect, sourceScrollStep, sourceViewport } from "../geometry";
import { sourceInputCaret } from "./focus";

/** Bounded focus/keyboard reveal; ordinary scrolling never retains a navigation anchor. */
export class SourceInputReveal {
  private readonly win;
  private frame: number | undefined;
  private measuring = false;
  private generation = 0;
  private passes = 0;
  private disposed = false;

  /** @param view - Canonical source geometry. @param enabled - Current focused input ownership guard. @param margin - Preferred space for the host's actual caret/grip. */
  constructor(private readonly view: EditorView, private readonly enabled: () => boolean, private readonly margin = 8) {
    this.win = view.dom.ownerDocument.defaultView!;
  }

  /** Coalesce actual focus, input or keyboard-size changes; read geometry after the host updates its dock. */
  readonly request = (): void => {
    if (this.disposed || !this.enabled()) return;
    this.passes = 0;
    if (this.frame === undefined && !this.measuring) this.schedule();
  };

  /** Queue only one correction, preserving the next measured layout as the coordinate authority. */
  private schedule(): void {
    const generation = this.generation;
    this.frame = this.win.requestAnimationFrame(() => {
      this.frame = undefined;
      if (!this.current(generation)) return;
      this.measuring = true;
      this.view.requestMeasure({ key: this,
        read: () => {
          if (!this.current(generation)) return null;
          const range = this.view.state.selection.main;
          const caret = sourceInputCaret(this.view) ?? sourceCaretRect(this.view, range.head, range.assoc < 0 ? -1 : 1);
          if (!caret) return { virtual: EditorSelection.cursor(range.head) };
          const viewport = sourceViewport(this.view);
          if (viewport.bottom - viewport.top < 20) return { waiting: true };
          const margin = Math.min(Number.isFinite(this.margin) ? Math.max(0, this.margin) : 8, Math.max(0, (viewport.bottom - viewport.top - (caret.bottom - caret.top)) / 2));
          const delta = caret.top < viewport.top + margin ? caret.top - viewport.top - margin
            : caret.bottom > viewport.bottom - margin ? caret.bottom - viewport.bottom + margin : 0;
          if (Math.abs(delta) <= 1) return null;
          const step = sourceScrollStep(this.view, delta);
          return step ? { step } : { waiting: true };
        },
        write: result => {
          if (generation !== this.generation) return;
          this.measuring = false;
          if (!result || !this.current(generation)) return;
          if (result.virtual) {
            const target = result.virtual;
            // Virtualization is CM-owned. Dispatch outside its measure/write lock
            // and remeasure once its normal scroll has mounted the target.
            this.frame = this.win.requestAnimationFrame(() => {
              this.frame = undefined;
              if (!this.current(generation)) return;
              this.view.dispatch({ effects: EditorView.scrollIntoView(target) });
              if (++this.passes < 8) this.schedule();
            });
          } else if (result.step) {
            const step = result.step;
            // CM still restores its layout anchor after measure writes. Scroll
            // only after that phase completes, or it may undo this correction
            // with an anchor snapshot taken before the keyboard/dock changed.
            this.frame = this.win.requestAnimationFrame(() => {
              this.frame = undefined;
              if (!this.current(generation)) return;
              applySourceScrollStep(step);
              if (++this.passes < 8) this.schedule();
            });
          } else {
            // The host updates its document tail after the keyboard resize.
            // An occluded endpoint at the old scroll limit must await that
            // layout, while the same pass bound prevents permanent retries.
            if (++this.passes < 8) this.schedule();
          }
        } });
    });
  }

  /** @param generation - Captured asynchronous intent. @returns Whether that reveal still owns the focused editor. */
  private current(generation: number): boolean { return !this.disposed && generation === this.generation && this.enabled(); }

  /** Retire pending callbacks before scrolling, dragging or another input owner takes over. */
  readonly cancel = (): void => {
    this.generation++;
    if (this.frame !== undefined) this.win.cancelAnimationFrame(this.frame);
    this.frame = undefined; this.measuring = false;
  };

  /** Release every pending callback on native view destruction. */
  destroy(): void { this.disposed = true; this.cancel(); }
}
