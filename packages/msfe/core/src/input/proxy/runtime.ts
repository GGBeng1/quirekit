import { Transaction } from "@quirekit/cm-state";
import { isolateHistory } from "@quirekit/cm-commands";
import type { EditorView, ViewUpdate } from "@quirekit/cm-view";
import { compositionEffect, compositionField, modeFacet } from "../../state/fields";
import { createSourceInput } from "./surface";
import { sourceInputCaret, sourceInputOwners } from "./focus";
import { sourceProxyEffect, sourceProxyState } from "./state";
import { SourceInputEvents } from "./events";
import { bindSourceInputPointer } from "./pointer";
import { SourceInputReveal } from "./reveal";
import { guardSourceNativeSelection } from "./selection";
import { sourceCaretRect, sourceViewport } from "../geometry";
import type { SourceInputOwner, SourceInputProxyOptions } from "./types";

/** View-local input lifetime; the media query and DOM always use the mounted owner's realm. */
export class SourceInputRuntime implements SourceInputOwner {
  readonly input: HTMLTextAreaElement;
  private readonly query;
  private readonly events;
  private readonly controller;
  private readonly unbindPointer;
  private readonly unbindSelection;
  private readonly reveal;
  private destroyed = false;
  private scheduled = false;
  private readonly win;

  /** @param view - Canonical source/geometry authority. @param options - Explicit isolated input admission policy. */
  constructor(private readonly view: EditorView, private readonly options: SourceInputProxyOptions) {
    this.win = view.dom.ownerDocument.defaultView!;
    this.query = this.win.matchMedia(options.mediaQuery);
    this.input = createSourceInput(view);
    this.reveal = new SourceInputReveal(view, () => this.active && !view.state.readOnly && view.root.activeElement === this.input, options.revealMargin);
    this.events = new SourceInputEvents(view, this.input, () => this.active && !view.state.readOnly);
    this.controller = new this.win.AbortController();
    const listener = { signal: this.controller.signal };
    this.input.addEventListener("focus", this.focusChanged, listener);
    this.input.addEventListener("blur", this.focusChanged, listener);
    view.contentDOM.addEventListener("focus", () => { if (this.active) this.focus(); }, listener);
    this.unbindPointer = bindSourceInputPointer(view, () => this.active, () => { this.focus(); this.reveal.request(); }, options.onSelectionTap);
    this.unbindSelection = guardSourceNativeSelection(view, () => this.active);
    this.query.addEventListener("change", this.schedule);
    this.win.addEventListener("resize", this.measure, listener);
    this.win.visualViewport?.addEventListener("resize", this.measure, listener);
    this.win.addEventListener("resize", this.reveal.request, listener);
    this.win.visualViewport?.addEventListener("resize", this.reveal.request, listener);
    this.win.visualViewport?.addEventListener("scroll", this.measure, listener);
    view.dom.ownerDocument.addEventListener("scroll", this.measure, { ...listener, capture: true, passive: true });
    for (const event of ["wheel", "touchmove", "pointerdown"]) view.dom.ownerDocument.addEventListener(event, this.reveal.cancel, { ...listener, capture: true, passive: true });
    sourceInputOwners.set(view, this);
    this.schedule();
  }

  /** @returns Whether the display DOM currently relinquishes editable input ownership. */
  get active(): boolean { return !this.destroyed && (this.view.state.field(sourceProxyState, false)?.active ?? false); }

  /** Delegate native nearest-caret scroll to the single visual-viewport owner. */
  revealSelection(): void { this.reveal.request(); }

  /** Acquires the native keyboard host synchronously within the accepted user gesture. */
  focus(): void {
    if (!this.active || this.view.state.readOnly) return;
    const range = this.view.dom.ownerDocument.getSelection();
    if (range?.anchorNode && this.view.contentDOM.contains(range.anchorNode)) range.removeAllRanges();
    this.place(); this.input.focus({ preventScroll: true });
    // Acquire the native text-control selection after focus metadata has been
    // accepted. Its collapsed buffer caret must remain the keyboard target;
    // rendered source selection belongs exclusively to CM and the overlay.
    if (!this.view.state.field(compositionField, false)) this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  }

  /** @param event - Native owner focus boundary, independent of contentDOM focus. */
  private readonly focusChanged = (event: FocusEvent): void => {
    if (this.destroyed) return;
    if (event.type === "blur") { this.events.reset(); this.reveal.cancel(); }
    this.view.dispatch({ effects: [sourceProxyEffect.of({ focused: event.type === "focus", ...(event.type === "blur" ? { preedit: null } : {}) }),
      ...(event.type === "blur" ? [compositionEffect.of(false)] : [])], annotations: [Transaction.addToHistory.of(false),
        ...(event.type === "focus" ? [isolateHistory.of("before")] : [])] });
  };

  /** @param update - Accepted source, presentation, focus and geometry dependencies. */
  update(update: ViewUpdate): void {
    const before = update.startState.field(sourceProxyState), after = update.state.field(sourceProxyState);
    // External edits keep the session: preedit maps with the source and commits there.
    if (update.startState.readOnly !== update.state.readOnly || update.startState.facet(modeFacet) !== update.state.facet(modeFacet)
      || before.active !== after.active
      || update.startState.field(compositionField, false) !== update.state.field(compositionField, false)) this.schedule();
    if (update.docChanged || update.selectionSet || update.geometryChanged || update.viewportChanged || before.preedit !== after.preedit) this.measure();
    if (update.docChanged && update.transactions.some(transaction => transaction.isUserEvent("input"))
      || before.preedit !== after.preedit && after.preedit) this.reveal.request();
  }

  /** Coalesces media/permission changes after CM's update lock; never changes owner during preedit. */
  private readonly schedule = (): void => {
    if (this.destroyed || this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false; if (this.destroyed) return;
      const state = this.view.state, composing = state.field(compositionField, false), previous = state.field(sourceProxyState);
      const wanted = this.query.matches && !state.readOnly && (this.options.modes ?? ["live"]).includes(state.facet(modeFacet));
      // ViewPlugin construction precedes CM's initial content attributes. Resolve
      // the accepted host label after that phase so the native input keeps its AX name.
      this.input.setAttribute("aria-label", this.view.contentDOM.getAttribute("aria-label") ?? "Markdown 编辑器");
      if (composing && !state.readOnly) return;
      const focused = this.view.root.activeElement === this.input || this.view.hasFocus;
      if (state.readOnly) this.events.reset();
      this.input.disabled = !wanted;
      this.input.hidden = !wanted;
      if (wanted !== previous.active || previous.preedit && !composing || state.readOnly && composing) {
        this.view.dispatch({ effects: [sourceProxyEffect.of({ active: wanted, focused: wanted && focused, preedit: null }), compositionEffect.of(false)], annotations: Transaction.addToHistory.of(false) });
      }
      this.view.dom.toggleAttribute("data-msfe-input-proxy", wanted);
      if (focused && !state.readOnly && wanted !== previous.active) { if (wanted) this.focus(); else this.view.focus(); }
      this.measure();
    });
  };

  /** Requests one endpoint read/write per native measure phase, only for an active focused host. */
  private readonly measure = (): void => {
    if (!this.active || this.view.root.activeElement !== this.input) return;
    this.view.requestMeasure({ key: this, read: () => this.active && this.view.root.activeElement === this.input ? this.geometry() : null,
      write: rect => { if (rect && this.active) this.writeGeometry(rect); } });
  };

  /** @returns Independent host placement clipped to usable client space, even while the real caret is unmounted. */
  private geometry(): { left: number; top: number; height: number } | null {
    const head = this.view.state.selection.main.head;
    const caret = sourceInputCaret(this.view) ?? sourceCaretRect(this.view, head, this.view.state.selection.main.assoc < 0 ? -1 : 1);
    const viewport = sourceViewport(this.view), height = Math.max(20, caret ? caret.bottom - caret.top : 20);
    // The invisible keyboard host must remain inside the usable area even while
    // its real source caret is temporarily virtualized. This is input placement,
    // not substitute geometry for the visible document overlay.
    const top = Math.max(viewport.top, Math.min(caret?.top ?? (Number.parseFloat(this.input.style.top) || viewport.top), viewport.bottom - height - 8));
    const left = Math.max(viewport.left, Math.min(caret?.left ?? (Number.parseFloat(this.input.style.left) || viewport.left), viewport.right - 1));
    return { left, top, height };
  }

  /** @param rect - Current parent-local caret placement, without source serialization. */
  private writeGeometry(rect: { left: number; top: number; height: number }): void {
    this.input.style.left = `${rect.left}px`; this.input.style.top = `${rect.top}px`; this.input.style.height = `${Math.max(20, rect.height)}px`;
  }

  /** Places once before synchronous user-activated focus, preventing scroll to an offscreen textarea. */
  private place(): void { const rect = this.geometry(); if (rect) this.writeGeometry(rect); }

  /** Releases every native host/listener without committing unfinished input or stealing another owner's focus. */
  destroy(): void {
    this.destroyed = true; this.controller.abort(); this.query.removeEventListener("change", this.schedule);
    this.reveal.destroy(); this.events.destroy(); this.unbindPointer(); this.unbindSelection(); this.input.remove(); sourceInputOwners.delete(this.view);
    this.view.dom.removeAttribute("data-msfe-input-proxy");
  }
}
