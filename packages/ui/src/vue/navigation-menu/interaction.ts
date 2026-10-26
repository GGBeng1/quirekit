/**
 * Bridges Zag 1.43's inline Content gap: its pointerleave handler ignores the
 * root's disablePointerLeaveClose flag (the Viewport handler respects it).
 * @param event - Content-only pointer leave, before Ark's bubble listener.
 * @param trigger - Public paired interaction policy.
 */
export function containPointerLeave(event: PointerEvent, trigger: 'click' | 'hover'): void {
  if (trigger === 'click') event.stopImmediatePropagation();
}

/**
 * Keeps mouse hover activation from becoming an unrelated click toggle, while
 * preserving native keyboard clicks and touch/pen activation through Ark.
 * @param event - Original trigger activation.
 * @param trigger - Public paired interaction policy.
 */
export function guardHoverClick(event: MouseEvent, trigger: 'click' | 'hover'): void {
  if (trigger === 'hover' && event.detail > 0 && (!('pointerType' in event) || event.pointerType === 'mouse')) {
    event.stopImmediatePropagation();
  }
}
