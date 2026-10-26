import { EditorView } from "@quirekit/cm-view";
import { applySourceScrollStep, sourceScrollStep, sourceViewport } from "../input/geometry/viewport";
import type { ScrollAnchor, ScrollRestoration } from "./types";
import { compositionField } from "../state/fields";
import { revealSelectionField } from "../presentation/gesture";

const pending = new WeakMap<EditorView, ScrollRestoration>();

/** @param view - Source owner receiving a newer navigation or presentation intent. */
export function cancelScrollAnchor(view: EditorView): void { pending.get(view)?.cancel(); }

/**
 * Captures a source character anchor before changing presentation metrics.
 * @param view - Mounted source coordinate owner.
 * @returns Measurable source anchor, if the visible line has text geometry.
 */
export function captureScrollAnchor(view: EditorView): ScrollAnchor | undefined {
  const previous = pending.get(view);
  cancelScrollAnchor(view);
  if (view.compositionStarted || view.state.field(compositionField, false) || view.state.field(revealSelectionField, false)) return;
  // A host can change both mode and source visibility in one update. Keep the
  // original character offset until that batch is measured, not its intermediate layout.
  if (previous && previous.anchor.doc === view.state.doc && previous.current()) return previous.anchor;
  const viewport = sourceViewport(view);
  const head = view.state.selection.main.head, caret = view.coordsAtPos(head);
  if (caret && caret.bottom > caret.top && caret.top >= viewport.top && caret.bottom <= viewport.bottom)
    return { doc: view.state.doc, position: head, offset: caret.top - viewport.top };
  const box = view.contentDOM.getBoundingClientRect();
  const hit = view.posAtCoords({ x: Math.max(viewport.left, box.left) + 1,
    y: Math.min(viewport.bottom - 1, Math.max(viewport.top, box.top) + view.defaultLineHeight / 2) }, false);
  const position = hit ?? view.lineBlockAtHeight(Math.max(0, viewport.top - view.documentTop)).from;
  const coordinates = view.coordsAtPos(position);
  return coordinates ? { doc: view.state.doc, position,
    offset: coordinates.top - viewport.top } : undefined;
}

/** @param anchor - Captured visible source position. @returns Native navigation that also mounts virtualized anchors. */
export function scrollAnchorEffects(anchor: ScrollAnchor | undefined) {
  return anchor ? [EditorView.scrollIntoView(anchor.position, { y: "start", yMargin: anchor.offset })] : [];
}

/**
 * Corrects the character offset after native navigation mounts the source anchor.
 * @param view - Mounted editor whose layout has changed.
 * @param anchor - Previously measured character anchor.
 * @param current - Lifetime/generation predicate for an outstanding mode request.
 * @returns Cancellation for both the pending frame and measurement callback.
 */
export function restoreScrollAnchor(view: EditorView, anchor: ScrollAnchor | undefined, current: () => boolean): () => void {
  cancelScrollAnchor(view);
  const host = view.dom.ownerDocument.defaultView;
  if (!anchor || !host) return () => {};
  let cancelled = false, frame = 0;
  const document = view.dom.ownerDocument, events = ["pointerdown", "wheel", "touchmove", "keydown"];
  /** Releases the one pending correction and its short-lived user-intent listeners. */
  const cancel = () => {
    cancelled = true; host.cancelAnimationFrame(frame);
    for (const event of events) document.removeEventListener(event, cancel, true);
    if (pending.get(view)?.cancel === cancel) pending.delete(view);
  };
  pending.set(view, { anchor, cancel, current });
  for (const event of events) document.addEventListener(event, cancel, { capture: true, passive: true });
  // Native navigation applies scrolling after its measurement writes. Correct the character
  // offset only in the following layout cycle, so two independent adjustments cannot add up.
  frame = host.requestAnimationFrame(() => {
    if (cancelled || !current()) { cancel(); return; }
    view.requestMeasure({
      key: restoreScrollAnchor,
      read: () => {
        if (cancelled || !current() || view.state.doc !== anchor.doc) return null;
        const coordinates = view.coordsAtPos(anchor.position);
        return coordinates ? sourceScrollStep(view, coordinates.top - sourceViewport(view).top - anchor.offset) : null;
      },
      write: step => {
        const apply = !cancelled && current() && step;
        cancel(); if (apply) applySourceScrollStep(apply);
      },
    });
  });
  return cancel;
}
