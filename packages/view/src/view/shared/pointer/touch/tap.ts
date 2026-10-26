import type { MountedTouchTapOptions } from "./types";

/**
 * Defers touch focus until a tap is distinguished from scroll, pinch or a hold.
 * @param options - Interaction planes, owner document and accepted-tap callback.
 * @returns Cleanup for all candidate and surface listeners.
 */
export function bindMountedTouchTaps(options: MountedTouchTapOptions): () => void {
  const doc = options.ownerDocument;
  let candidate: PointerEvent | undefined;
  let accepted = false;
  const seen = new WeakSet<Event>();
  /** Drops an uncommitted touch without changing document selection or focus. */
  function cancel(): void { candidate = undefined; listen(false); }
  /** @param active - Only pending touches need document-wide cancellation observers. */
  function listen(active: boolean): void {
    const method = active ? "addEventListener" : "removeEventListener";
    doc[method]("pointerdown", multi as EventListener, true);
    doc[method]("pointermove", move as EventListener, true);
    doc[method]("pointercancel", cancel, true);
    doc[method]("scroll", cancel, true);
    doc.defaultView?.[method]("blur", cancel);
  }
  /** @param event - A second finger relinquishes the candidate to pinch/scroll. */
  function multi(event: PointerEvent): void {
    if (candidate && event.pointerId !== candidate.pointerId) cancel();
  }
  /** @param event - Surface press; leave its default action available to scrolling. */
  function down(event: PointerEvent): void {
    if (seen.has(event)) return;
    seen.add(event);
    if (event.pointerType !== "touch" || event.isPrimary === false || event.button !== 0
      || options.ignore?.(event)) return;
    accepted = false;
    candidate = event;
    listen(true);
  }
  /** @param event - Pointer travel while the browser decides whether to scroll. */
  function move(event: PointerEvent): void {
    if (candidate?.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - candidate.clientX, event.clientY - candidate.clientY) > 8) cancel();
  }
  /** @param event - Native terminal event, delivered only if no hold owner consumed it. */
  function up(event: PointerEvent): void {
    const start = candidate;
    if (!start || start.pointerId !== event.pointerId) return;
    cancel();
    if (event.defaultPrevented || options.ignore?.(event)
      || event.timeStamp - start.timeStamp >= 450
      || Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 8) return;
    accepted = true;
    options.tap(event);
  }
  /** @param event - Suppresses the compatibility mouse click that would blur the freshly focused input. */
  function touchEnd(event: Event): void {
    if (!accepted) return;
    accepted = false;
    event.preventDefault();
  }
  // Release stays on the surface: a public long-press owner can consume it at
  // window capture first. Pending taps never capture the pointer or block scroll.
  for (const target of options.targets) {
    target.addEventListener("pointerdown", down as EventListener);
    target.addEventListener("pointerup", up as EventListener);
    target.addEventListener("touchend", touchEnd, { passive: false });
  }
  return () => {
    cancel();
    for (const target of options.targets) {
      target.removeEventListener("pointerdown", down as EventListener);
      target.removeEventListener("pointerup", up as EventListener);
      target.removeEventListener("touchend", touchEnd);
    }
  };
}
