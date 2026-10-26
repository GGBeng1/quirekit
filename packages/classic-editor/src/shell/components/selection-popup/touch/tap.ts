import type { SelectedTextTapCandidate, SelectedTextTapOptions } from "./types";

/**
 * Consumes only completed short taps on already-selected painted text.
 * @param options - Product root, current editor and toolbar visibility owner.
 * @returns Cleanup for the candidate and native event observers.
 */
export function bindSelectedTextTap(options: SelectedTextTapOptions): () => void {
  const { root, editor } = options;
  const doc = root.ownerDocument;
  const win = doc.defaultView!;
  let candidate: SelectedTextTapCandidate | undefined;
  let accepted = false;
  let acceptedAt = 0;

  /** Releases transient observers without changing selection or focus. */
  function cancel(): void {
    candidate = undefined;
    win.removeEventListener("pointerup", up, true);
    win.removeEventListener("pointermove", move, true);
    win.removeEventListener("pointercancel", cancel, true);
    win.removeEventListener("blur", cancel);
    doc.removeEventListener("scroll", cancel, true);
    doc.removeEventListener("visibilitychange", cancel);
  }
  /** @param event - Unscaled client sample. @returns Whether it hits actual selected glyph geometry. */
  function contains(event: PointerEvent): boolean {
    const selection = editor.state.pm.selection;
    const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
    if (pos === undefined || pos < selection.from || pos > selection.to) return false;
    // Hit testing bounds the query to neighboring positions, even for select-all.
    // Painted fragments exclude whitespace in the selection's bounding rectangle.
    const rects = editor.view.getTextRangeRects?.({ from: Math.max(selection.from, pos - 1),
      to: Math.min(selection.to, pos + 1) }, editor.state.doc);
    return rects?.some(rect => event.clientX >= rect.x && event.clientX <= rect.x + rect.width
      && event.clientY >= rect.y && event.clientY <= rect.y + rect.height) ?? false;
  }
  /** @param event - Capture before outside dismissal; never block press/scroll defaults. */
  function down(event: PointerEvent): void {
    accepted = false;
    if (candidate) { cancel(); return; }
    if (event.pointerType !== "touch" || !event.isPrimary || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof win.Element) || !root.contains(target)
      || !target.closest("[data-qk-view]") || target.closest("[data-qk-overlays]")) return;
    const selection = editor.state.pm.selection;
    if (selection.empty || selection.toJSON().type !== "text" || !contains(event)) return;
    candidate = { event, selection, doc: editor.state.doc, visible: options.isVisible() };
    win.addEventListener("pointerup", up, true);
    win.addEventListener("pointermove", move, true);
    win.addEventListener("pointercancel", cancel, true);
    win.addEventListener("blur", cancel);
    doc.addEventListener("scroll", cancel, true);
    doc.addEventListener("visibilitychange", cancel);
  }
  /** @param event - Travel gives ownership back to scroll, pinch or long-press dragging. */
  function move(event: PointerEvent): void {
    if (candidate && event.pointerId === candidate.event.pointerId
      && Math.hypot(event.clientX - candidate.event.clientX, event.clientY - candidate.event.clientY) > 8) cancel();
  }
  /** @param event - Consume before View's surface-level tap handler applies a caret. */
  function up(event: PointerEvent): void {
    const start = candidate;
    if (!start || start.event.pointerId !== event.pointerId) return;
    cancel();
    if (event.defaultPrevented || event.timeStamp - start.event.timeStamp >= 450
      || Math.hypot(event.clientX - start.event.clientX, event.clientY - start.event.clientY) > 8
      || editor.state.doc !== start.doc || editor.state.pm.selection !== start.selection || !contains(event)) return;
    event.preventDefault();
    accepted = true;
    acceptedAt = event.timeStamp;
    options.toggle(!start.visible);
  }
  /** @param event - Compatibility input must not blur or collapse a consumed text tap. */
  function compatibility(event: Event): void {
    if (!accepted || event.timeStamp - acceptedAt > 800) return;
    const target = event.target;
    if (!(target instanceof win.Element) || !target.closest("[data-qk-view]")) return;
    if (event instanceof win.MouseEvent && event.detail === 0) return;
    event.preventDefault();
    if (event.type === "click") { accepted = false; event.stopPropagation(); }
  }
  win.addEventListener("pointerdown", down, true);
  root.addEventListener("touchend", compatibility, { passive: false });
  root.addEventListener("click", compatibility, true);
  return () => {
    cancel();
    accepted = false;
    win.removeEventListener("pointerdown", down, true);
    root.removeEventListener("touchend", compatibility);
    root.removeEventListener("click", compatibility, true);
  };
}
