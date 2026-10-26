import type { QuireKitAnchorContainer, QuireKitAnchorItem } from './types';

/** @param source - Optional owner descriptor. @returns The explicit element, document scroller, or null until mounted. */
export function resolveAnchorContainer(source: QuireKitAnchorContainer | undefined): HTMLElement | null {
  if (source === undefined) return document.scrollingElement as HTMLElement | null;
  if (typeof source === 'function') return source() ?? null;
  if (typeof source === 'string') return document.querySelector<HTMLElement>(source);
  return source;
}
/** @param items - Hierarchical locations. @returns Unique IDs in reading order. */
export function anchorIds(items: readonly QuireKitAnchorItem[]): string[] {
  return [...new Set(items.flatMap(item => [item.id, ...anchorIds(item.children ?? [])]))];
}
/**
 * Looks up IDs without treating heading text as a CSS selector.
 * @param ids - Flattened heading IDs.
 * @param owner - Actual scroll container.
 * @returns Visible targets belonging to this scroll owner.
 */
export function anchorTargets(ids: readonly string[], owner: HTMLElement): HTMLElement[] {
  return ids.flatMap(id => {
    const target = document.getElementById(id);
    return target && owner.contains(target) && target.getClientRects().length > 0
      && getComputedStyle(target).visibility !== 'hidden' ? [target] : [];
  });
}
/** @param owner - Actual scroller. @returns Its inner top edge in viewport coordinates. */
export function anchorViewportTop(owner: HTMLElement): number {
  return owner === document.scrollingElement ? 0 : owner.getBoundingClientRect().top + owner.clientTop;
}
/**
 * Adds only the temporary focusability needed by a heading.
 * @param target - Destination of an explicit navigation.
 * @returns Cleanup for a later navigation or component disposal.
 */
export function focusAnchor(target: HTMLElement): () => void {
  const temporary = !target.hasAttribute('tabindex') && target.tabIndex < 0;
  if (temporary) target.setAttribute('tabindex', '-1');
  /** Removes only the attribute installed by this navigation. */
  function cleanup(): void {
    if (temporary && target.getAttribute('tabindex') === '-1') target.removeAttribute('tabindex');
    target.removeEventListener('blur', cleanup);
  }
  target.addEventListener('blur', cleanup, { once: true });
  target.focus({ preventScroll: true });
  return cleanup;
}
