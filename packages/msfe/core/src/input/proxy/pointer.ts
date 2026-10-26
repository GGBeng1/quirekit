import { EditorSelection, Transaction } from "@quirekit/cm-state";
import { isolateHistory } from "@quirekit/cm-commands";
import type { EditorView } from "@quirekit/cm-view";
import { compositionField } from "../../state/fields";
import { sourceInputPosition } from "../geometry";
import type { SourceInputProxyOptions } from "./types";

/**
 * Accepts short taps in noneditable source text, leaving scrolling and public long-hold gestures intact.
 * @param view - Canonical source/layout authority.
 * @param active - Current isolated input admission guard.
 * @param focus - Native keyboard acquisition, called within the user's tap activation.
 * @param selectionTap - Optional host-owned existing-selection action.
 * @returns Listener disposer.
 */
export function bindSourceInputPointer(view: EditorView, active: () => boolean, focus: () => void, selectionTap?: SourceInputProxyOptions["onSelectionTap"]): () => void {
  const win = view.dom.ownerDocument.defaultView!, controller = new win.AbortController();
  const options = { capture: true, signal: controller.signal };
  let start: { x: number; y: number; time: number; moved: boolean } | null = null;
  let suppressClick = false;
  /** @param event - Pointer intent. @returns Whether plain rendered text belongs to this owner. */
  function owns(event: Event): boolean {
    const target = event.target;
    return active() && target instanceof win.Element && !target.closest("button, input, textarea, select, a[href], [role=button], .msfe-node-view, .msfe-component-view, [data-qk-not-prose]");
  }
  /** @param x - Accepted client coordinate. @param y - Accepted client coordinate. */
  function tap(x: number, y: number): void {
    const gesture = start; start = null;
    if (gesture && (gesture.moved || win.performance.now() - gesture.time >= 450) || view.state.field(compositionField, false)) return;
    if (selectionTap?.(view, { x, y })) return;
    const pos = sourceInputPosition(view, { x, y });
    if (pos === null) return;
    view.dispatch({ selection: EditorSelection.single(pos), annotations: [Transaction.addToHistory.of(false), isolateHistory.of("before")], userEvent: "select" });
    focus();
  }
  view.contentDOM.addEventListener("pointerdown", event => {
    suppressClick = false;
    start = owns(event) ? { x: event.clientX, y: event.clientY, time: win.performance.now(), moved: false } : null;
  }, options);
  view.contentDOM.addEventListener("pointermove", event => { if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) start.moved = true; }, options);
  view.contentDOM.addEventListener("pointercancel", () => { start = null; }, options);
  // CM's mouse selection must not acquire a native Range in the display DOM.
  // Touch scrolling stays passive; the actual short tap is accepted at click.
  view.contentDOM.addEventListener("mousedown", event => { if (owns(event)) { event.preventDefault(); event.stopPropagation(); } }, options);
  view.contentDOM.addEventListener("touchend", event => {
    if (!owns(event) || event.touches.length || !start || start.moved) return;
    // WebKit's default text-tap can replace the native input session after a
    // JS focus call, despite reporting the proxy as activeElement. Claim the
    // accepted touch end before UIKit's default; ordinary scrolling remains free.
    event.preventDefault();
    suppressClick = true;
    const point = event.changedTouches[0]; if (point) tap(point.clientX, point.clientY);
  }, { ...options, passive: false });
  view.contentDOM.addEventListener("click", event => {
    if (!owns(event)) return;
    event.preventDefault(); event.stopPropagation();
    if (suppressClick) { suppressClick = false; return; }
    tap(event.clientX, event.clientY);
  }, options);
  view.contentDOM.addEventListener("contextmenu", event => { if (owns(event)) { event.preventDefault(); event.stopPropagation(); } }, options);
  return () => controller.abort();
}
