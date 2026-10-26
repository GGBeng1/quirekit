import type { QuireBlockPointerLease } from "@quirekit/core";
import { bindMountedPointerDragDocumentEvents, createMountedPointerDragFrameCoordinator } from "../pointer/drag";
import { createMountedPointerAutoScrollController } from "../pointer/auto-scroll";
import { tryReleaseMountedPointerCapture, trySetMountedPointerCapture } from "../pointer/dom";
import type { BindMountedPointerSessionOptions } from "../pointer/session/types";
import type { MountedBlockPointerOwner } from "./types";

/**
 * Extends the mounted pointer owner using its shared continuation/frame/scroll primitives.
 * @param options - Current mount authorities.
 * @param available - Whether another pointer owner has already captured input.
 * @returns Exclusive block-pointer lifecycle.
 */
export function createMountedBlockPointerOwner(options: BindMountedPointerSessionOptions, available: () => boolean): MountedBlockPointerOwner {
  let cancelActive: (() => void) | null = null;
  let validateActive: (() => void) | null = null;
  return {
    active: () => cancelActive !== null,
    cancel: () => cancelActive?.(),
    validate: () => validateActive?.(),
    begin(event: PointerEvent, lease: QuireBlockPointerLease) {
      if (cancelActive || !available() || (!options.mountedView.editable && !lease.selectionOnly) || options.isDrawingCreationActive?.() || event.button !== 0 || event.isPrimary === false) return null;
      const sourceDoc = options.mountedView.state.doc;
      const editable = options.mountedView.editable;
      const ownerDocument = options.root.ownerDocument;
      const ownerWindow = ownerDocument.defaultView;
      const pointerId = event.pointerId;
      let ended = false;
      let releaseEvents = (): void => {};
      /** @returns Whether the original document and interaction mode still own this lease. */
      const valid = (): boolean => sourceDoc === options.mountedView.state.doc && editable === options.mountedView.editable;
      const frame = createMountedPointerDragFrameCoordinator({ root: options.root, applyPoint: point => {
        if (!valid()) { cancel(); return; }
        const scrolling = lease.update(point);
        if (scrolling === null) { cancel(); return; }
        if (scrolling) scroll.update(point); else scroll.stop();
      }, requestFrame: options.requestPointerDragFrame, cancelFrame: options.cancelPointerDragFrame });
      const scroll = (options.createPointerAutoScrollController ?? createMountedPointerAutoScrollController)({ root: options.root, edgeThreshold: 40, onScrollFrame: point => {
        // Scroll changes geometry even at the same client point. Clear the
        // coordinator's point equality cache before querying the fresh layout.
        frame.cancel(); frame.update(point); frame.flush();
      } });
      /** Releases browser resources before semantic callbacks can dispatch. */
      const cleanup = (): void => {
        ended = true; frame.cancel(); scroll.stop(); releaseEvents();
        ownerDocument.removeEventListener("keydown", keydown, true);
        ownerWindow?.removeEventListener("blur", cancel);
        tryReleaseMountedPointerCapture(options.coordinateSurface, pointerId);
        cancelActive = null; validateActive = null;
      };
      /** Cancels without applying the queued final sample. */
      const cancel = (): void => { if (!ended) { cleanup(); lease.cancel(); } };
      /** @param key - Captured keyboard cancellation. */
      const keydown = (key: KeyboardEvent): void => { if (key.key === "Escape" && !key.isComposing) { key.preventDefault(); key.stopPropagation(); cancel(); } };
      const seen = new WeakSet<Event>();
      /** @param sample - Browser continuation event. */
      const move = (sample: PointerEvent): void => {
        if (sample.pointerId !== pointerId || ended || seen.has(sample)) return;
        seen.add(sample); sample.preventDefault(); sample.stopPropagation(); frame.update(sample);
      };
      /** @param sample - Browser completion or cancellation. */
      const finish = (sample: PointerEvent): void => {
        if (sample.pointerId !== pointerId || ended) return;
        sample.preventDefault(); sample.stopPropagation();
        if (sample.type === "pointercancel" || !valid()) { cancel(); return; }
        // Finish against the last scrollport and its published geometry, never
        // let a pending edge-scroll frame race the durable pointerup sample.
        scroll.stop(); options.renderSelection("flush-pending");
        frame.cancel(); frame.update(sample); frame.flush();
        if (ended) return;
        cleanup(); lease.finish();
      };
      cancelActive = cancel;
      validateActive = () => { if (!valid()) cancel(); };
      releaseEvents = bindMountedPointerDragDocumentEvents({ ownerDocument, handlePointerMove: move, handlePointerEnd: finish });
      ownerDocument.addEventListener("keydown", keydown, true);
      ownerWindow?.addEventListener("blur", cancel);
      trySetMountedPointerCapture(options.coordinateSurface, pointerId);
      event.preventDefault(); event.stopPropagation();
      return cancel;
    }
  };
}
