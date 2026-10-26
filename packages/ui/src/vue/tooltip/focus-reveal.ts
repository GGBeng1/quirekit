import type { InjectionKey } from "vue";
import type { TooltipFocusPolicy } from "./types";

/** Shares reactive root settings without introducing another visibility state. */
export const tooltipFocusPolicyKey: InjectionKey<TooltipFocusPolicy> = Symbol("tooltip-focus-policy");

/**
 * Finds scrollports that can move or clip a trigger.
 * @param trigger - The actual button or as-child focus target.
 * @returns Clipping ancestors in nearest-first order.
 */
function scrollports(trigger: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  const win = trigger.ownerDocument.defaultView!;
  let parent = trigger.parentElement;
  while (parent) {
    const style = win.getComputedStyle(parent);
    // Boxless toolbar wrappers cannot clip descendants even when they retain an
    // overflow declaration; only real scrollport boxes constrain visible focus.
    if (style.display !== "contents"
      && /(auto|scroll|overlay|hidden|clip)/u.test(`${style.overflowX} ${style.overflowY}`)) result.push(parent);
    parent = parent.parentElement;
  }
  return result;
}

/**
 * Allows a large trigger's visible portion to remain an accessible explanation target.
 * @param trigger - The focused target after scrolling settles.
 * @param parents - Scrollports whose visible rectangles constrain the target.
 * @returns Whether the target has a positive visible intersection with every scrollport.
 */
function isPartlyVisible(trigger: HTMLElement, parents: readonly HTMLElement[]): boolean {
  const rect = trigger.getBoundingClientRect();
  const win = trigger.ownerDocument.defaultView!;
  let top = Math.max(0, rect.top);
  let left = Math.max(0, rect.left);
  let bottom = Math.min(win.innerHeight, rect.bottom);
  let right = Math.min(win.innerWidth, rect.right);
  for (const parent of parents) {
    const box = parent.getBoundingClientRect();
    top = Math.max(top, box.top + parent.clientTop);
    left = Math.max(left, box.left + parent.clientLeft);
    bottom = Math.min(bottom, box.top + parent.clientTop + parent.clientHeight);
    right = Math.min(right, box.left + parent.clientLeft + parent.clientWidth);
  }
  return bottom > top && right > left;
}

/**
 * Hands keyboard focus to Ark after native scrolling settles, keeping the original event.
 * Pointer opening, visibility, dismissal and positioning stay entirely in Ark.
 * @param event - The real FocusEvent received by the public trigger.
 * @param forward - The current Ark focus handler.
 * @returns Cancellation for blur, host changes or component unmount.
 */
export function forwardTooltipFocus(event: FocusEvent, forward: (event: FocusEvent) => void): () => void {
  const trigger = event.target as HTMLElement;
  const doc = trigger.ownerDocument;
  const win = doc.defaultView!;
  const parents = scrollports(trigger);
  if (event.defaultPrevented || !trigger.matches(":focus-visible")) {
    forward(event);
    return () => {};
  }

  // Native focus can reveal the target before focusin, then dispatch scroll later.
  // Every keyboard focus waits for the same stable window before Ark owns dismissal.
  let frame = 0;
  let stationary = 0;
  let positions = readPositions();

  /** @returns The current positions in all relevant scroll coordinate spaces. */
  function readPositions(): string {
    return [win.scrollX, win.scrollY, ...parents.flatMap(parent => [parent.scrollLeft, parent.scrollTop])].join(",");
  }

  /** Cancels delivery without changing the machine or moving focus. */
  function cancel(): void {
    win.cancelAnimationFrame(frame);
    trigger.removeEventListener("focusout", cancel);
    doc.removeEventListener("wheel", cancel, true);
    doc.removeEventListener("touchstart", cancel, true);
    doc.removeEventListener("pointerdown", cancel, true);
    doc.removeEventListener("keydown", keydown);
  }

  /**
   * User scrolling, activation and Escape supersede a pending focus explanation.
   * @param input - User keyboard input following the focus event.
   */
  function keydown(input: KeyboardEvent): void {
    if (!input.isComposing && !input.defaultPrevented) cancel();
  }

  /** Waits for real geometry to settle instead of guessing a scrolling duration. */
  function settle(): void {
    if (doc.activeElement !== trigger || event.defaultPrevented) {
      cancel();
      return;
    }
    const next = readPositions();
    stationary = next === positions ? stationary + 1 : 0;
    positions = next;
    if (stationary < 3) {
      frame = win.requestAnimationFrame(settle);
      return;
    }
    cancel();
    if (isPartlyVisible(trigger, parents)) forward(event);
  }

  trigger.addEventListener("focusout", cancel);
  doc.addEventListener("wheel", cancel, { capture: true, passive: true });
  doc.addEventListener("touchstart", cancel, { capture: true, passive: true });
  doc.addEventListener("pointerdown", cancel, { capture: true, passive: true });
  doc.addEventListener("keydown", keydown);
  frame = win.requestAnimationFrame(settle);
  return cancel;
}
