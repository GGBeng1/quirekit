import { contextMenuKeyboardPoint } from "./keyboard";

/**
 * Tracks a keyboard/programmatic region while Ark retains ownership of positioning.
 * @param target - The connected context region whose lower edge is the live anchor.
 * @param reposition - Requests Ark positioning with a fresh anchor-rectangle reader.
 * @returns Cleanup for the open menu's viewport listeners and pending frame.
 */
export function trackContextMenuRegion(
  target: HTMLElement,
  reposition: (getAnchorRect: () => { x: number; y: number; width: number; height: number }) => void
): () => void {
  const document = target.ownerDocument;
  const window = document.defaultView;
  if (!window) return () => {};
  let frame: number | undefined;
  let disposed = false;

  /** @returns The current region edge in viewport coordinates, read at positioning time. */
  function getAnchorRect() {
    return { ...contextMenuKeyboardPoint(target.getBoundingClientRect()), width: 0, height: 0 };
  }

  /** Repositions only a still-owned region after the current viewport update. */
  function update(): void {
    frame = undefined;
    if (!disposed && target.isConnected) reposition(getAnchorRect);
  }

  /** Coalesces page, nested-scroll, and visual-viewport changes into one frame. */
  function schedule(): void {
    if (!disposed && frame === undefined) frame = window!.requestAnimationFrame(update);
  }

  // Ark context-point repositioning disables its own listeners, so the adapter tracks only region-origin openings.
  document.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  window.visualViewport?.addEventListener("scroll", schedule);
  window.visualViewport?.addEventListener("resize", schedule);
  const observer = window.ResizeObserver ? new window.ResizeObserver(schedule) : undefined;
  observer?.observe(target);
  update();

  return () => {
    disposed = true;
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    observer?.disconnect();
    document.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
    window.visualViewport?.removeEventListener("scroll", schedule);
    window.visualViewport?.removeEventListener("resize", schedule);
  };
}
