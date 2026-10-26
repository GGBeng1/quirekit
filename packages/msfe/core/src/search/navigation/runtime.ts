import { EditorView, type ViewUpdate } from "@quirekit/cm-view";
import { getSearchQuery } from "@quirekit/cm-search";
import { compositionField, modeFacet } from "../../state/fields";
import { applyViewStateUpdate } from "../../editor/view-state";
import { navigationEffect } from "./effect";
import type { NavigationAnchor, NavigationWork } from "./types";
import { nodeGeometryPending } from "../../views/geometry/runtime";
import { navigationDelta } from "./viewport";
import { cancelScrollAnchor } from "../../mount/scroll";

/** Keeps the latest explicit source target visible through asynchronous layout, until a newer user intent. */
export class SourceNavigation {
  private anchor: NavigationAnchor | undefined;
  private frame: number | undefined;
  private measuring = false;
  private disposed = false;
  private stop: (() => void) | undefined;

  /** @param view - Canonical mounted view. @param cancelPresentation - Retires older mode-restoration callbacks. @param work - Editor-lifetime actual work counts. */
  constructor(private readonly view: EditorView, private readonly cancelPresentation: () => void, private readonly work: NavigationWork) {}

  /** Observes user intent only while an explicit target is retained, including host chrome and page margins. */
  private observeIntent(): void {
    const cancel = () => this.cancel();
    const events = ["wheel", "pointerdown", "touchmove", "keydown"];
    const document = this.view.dom.ownerDocument;
    // Page scrolling need not originate inside CM. An older anchor must never
    // pull back the viewport after the user acts on another part of the host.
    for (const event of events) document.addEventListener(event, cancel, { capture: true, passive: true });
    this.stop = () => { for (const event of events) document.removeEventListener(event, cancel, true); };
  }

  /** @param update - Accepted state or an actual native layout/viewport change. */
  update(update: ViewUpdate): void {
    const intent = update.transactions.flatMap(transaction => transaction.effects).filter(effect => effect.is(navigationEffect)).at(-1)?.value;
    if (intent) {
      this.cancel(); this.cancelPresentation(); cancelScrollAnchor(this.view);
      this.anchor = { ...intent, doc: update.state.doc, selection: update.state.selection };
      this.observeIntent();
    } else if (this.anchor && (update.docChanged || !update.state.selection.eq(this.anchor.selection)
      || update.state.facet(modeFacet) !== update.startState.facet(modeFacet) || update.state.readOnly !== update.startState.readOnly
      || update.state.field(compositionField) || this.anchor.search && !getSearchQuery(update.startState).eq(getSearchQuery(update.state)))) this.cancel();
    if (this.anchor && (intent || update.geometryChanged || update.viewportChanged)) this.measure();
  }

  /** @param anchor - Request captured before an asynchronous phase. @returns Whether it still belongs to the accepted source and user intent. */
  private current(anchor: NavigationAnchor): boolean {
    return !this.disposed && this.anchor === anchor && this.view.state.doc === anchor.doc && this.view.state.selection.eq(anchor.selection);
  }

  /** Coalesces native geometry reads; a stable viewport never schedules repeated work. */
  private measure(): void {
    const anchor = this.anchor;
    if (!anchor || this.measuring || this.frame !== undefined) return;
    this.measuring = true;
    this.view.requestMeasure({ key: this,
      read: () => {
        if (!this.current(anchor)) return 0;
        this.work.navigationMeasurements++;
        return navigationDelta(this.view, anchor);
      },
      write: delta => {
        this.measuring = false;
        if (!this.current(anchor)) { if (this.anchor) this.measure(); return; }
        if (delta !== null && Math.abs(delta) <= 1) return;
        // Accept newly measured component dimensions before correcting scroll; otherwise both native anchoring
        // and this correction would compensate for the same height change in competing coordinate snapshots.
        if (nodeGeometryPending(this.view)) {
          this.frame = this.view.dom.ownerDocument.defaultView!.requestAnimationFrame(() => {
            this.frame = undefined; if (this.current(anchor)) this.measure();
          });
          return;
        }
        // Native scrolling owns every scrolling ancestor, host margins and virtualization.
        // Re-enter it only after measured geometry settles, outside CM's write phase.
        this.frame = this.view.dom.ownerDocument.defaultView!.requestAnimationFrame(() => {
          this.frame = undefined;
          if (this.current(anchor) && applyViewStateUpdate(this.view, { effects: [EditorView.scrollIntoView(anchor.range, { y: anchor.y })] }).ok) this.work.navigationCorrections++;
        });
      },
    });
  }

  /** Retires both measured geometry and a not-yet-dispatched scroll. */
  private cancel(): void {
    this.anchor = undefined;
    this.stop?.(); this.stop = undefined;
    if (this.frame !== undefined) this.view.dom.ownerDocument.defaultView!.cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }

  /** Cancels document-specific work and removes capture listeners on replacement or disposal. */
  destroy(): void { this.disposed = true; this.cancel(); cancelScrollAnchor(this.view); }
}
