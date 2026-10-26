/** @param enabled - Live dismissal preference. @param close - Request closing the modal. @returns Pointer handlers distinguishing blank clicks from image gestures. */
export function createMaskDismiss(enabled: () => boolean, close: () => void) {
  let candidate: { id: number; x: number; y: number; target: Element } | undefined;
  const pointers = new Set<number>();
  /** @param event - Initial hit before the stage captures the pointer. */
  function down(event: PointerEvent): void {
    pointers.add(event.pointerId);
    const target = event.target;
    candidate = pointers.size === 1 && event.button === 0 && target instanceof Element && target.matches('.qk-image-preview__stage')
      ? { id: event.pointerId, x: event.clientX, y: event.clientY, target } : undefined;
  }
  /** @param event - Movement including drags that eventually return to their origin. */
  function move(event: PointerEvent): void {
    if (candidate && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 5) candidate = undefined;
  }
  /** @param event - Completed pointer; hit-test again because pointer capture retargets events. */
  function up(event: PointerEvent): void {
    const hit = candidate;
    pointers.delete(event.pointerId); candidate = undefined;
    if (enabled() && hit?.id === event.pointerId && Math.hypot(event.clientX - hit.x, event.clientY - hit.y) <= 5
      && hit.target.ownerDocument.elementFromPoint(event.clientX, event.clientY) === hit.target) close();
  }
  /** @param event - Cancelled pointer must never dismiss. */
  function cancel(event: PointerEvent): void { pointers.delete(event.pointerId); candidate = undefined; }
  return { down, move, up, cancel };
}
