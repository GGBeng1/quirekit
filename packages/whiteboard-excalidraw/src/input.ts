/** @param container - Inner runtime event owner. @returns Passive input-stability guard with exact listener cleanup. */
export function trackDraftInput(container: HTMLElement): { stable(): boolean; destroy(): void } {
  const owner = container.ownerDocument, pointers = new Set<number>();
  let composing = false;
  /** @param event - Native composition phase, observed without cancelling or modifying it. */
  function composition(event: Event): void { composing = event.type === "compositionstart"; }
  /** @param event - A drawing gesture starting in this editor. */
  function start(event: PointerEvent): void { pointers.add(event.pointerId); }
  /** @param event - Gesture completion, including outside the original container. */
  function end(event: PointerEvent): void { pointers.delete(event.pointerId); }
  /** Clears gestures abandoned when the window loses input ownership. */
  function blur(): void { pointers.clear(); }
  container.addEventListener("compositionstart", composition, true); container.addEventListener("compositionend", composition, true);
  container.addEventListener("pointerdown", start, true); owner.addEventListener("pointerup", end, true); owner.addEventListener("pointercancel", end, true);
  owner.defaultView?.addEventListener("blur", blur);
  return {
    /** @returns Whether passive serialization can capture a completed input state. */
    stable() { return !composing && pointers.size === 0; },
    /** Releases only listeners owned by this drawing task. */
    destroy() {
      container.removeEventListener("compositionstart", composition, true); container.removeEventListener("compositionend", composition, true);
      container.removeEventListener("pointerdown", start, true); owner.removeEventListener("pointerup", end, true); owner.removeEventListener("pointercancel", end, true);
      owner.defaultView?.removeEventListener("blur", blur); pointers.clear();
    },
  };
}
