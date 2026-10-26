/** @param viewport - Native scrolling row. @param rtl - Current physical direction. @returns Logical distance from the start, clamped against overscroll. */
export function readScrollOffset(viewport: HTMLElement, rtl: boolean): number {
  return Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, rtl ? -viewport.scrollLeft : viewport.scrollLeft));
}

/** @param viewport - Native scrolling row. @param value - Logical distance from the start. @param rtl - Current physical direction. @param behavior - Native scrolling behavior. */
export function writeScrollOffset(viewport: HTMLElement, value: number, rtl: boolean, behavior: ScrollBehavior): void {
  const offset = Math.max(0, Math.min(viewport.scrollWidth - viewport.clientWidth, value));
  viewport.scrollTo({ left: rtl ? -offset : offset, behavior });
}

/** @param target - Wheel target within the viewport. @param viewport - Owner's scroll boundary. @returns Whether a field or nested scroller owns the original wheel gesture. */
export function wheelBelongsToChild(target: Element, viewport: HTMLElement): boolean {
  const owner = target.closest('input, textarea, select, [contenteditable="true"], [role="slider"], [role="spinbutton"], [role="combobox"], [role="listbox"], [role="menu"], [role="dialog"], [data-scope="popover"][data-part="content"]');
  if (owner && viewport.contains(owner)) return true;
  for (let current: Element | null = target; current && current !== viewport; current = current.parentElement) {
    const style = current.ownerDocument.defaultView?.getComputedStyle(current);
    if (!style) continue;
    if (/(auto|scroll)/u.test(style.overflowX) && current.scrollWidth > current.clientWidth) return true;
    if (/(auto|scroll)/u.test(style.overflowY) && current.scrollHeight > current.clientHeight) return true;
  }
  return false;
}

/** @param target - Real focused field or action. @param viewport - The sole scroll owner. @param rtl - Current physical direction. */
export function revealElement(target: HTMLElement, viewport: HTMLElement, rtl: boolean): void {
  const item = target.getBoundingClientRect();
  const bounds = viewport.getBoundingClientRect();
  const start = item.left - bounds.left;
  const end = item.right - bounds.right;
  const delta = item.width > bounds.width ? (rtl ? end : start) : start < 0 ? start : end > 0 ? end : 0;
  if (Math.abs(delta) > 0.5) viewport.scrollTo({ left: viewport.scrollLeft + delta, behavior: "instant" });
}
