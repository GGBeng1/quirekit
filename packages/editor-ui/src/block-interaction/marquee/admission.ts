/**
 * Keeps exterior selection separate from text, embedded controls and product chrome.
 * @param event - Initial native press.
 * @param viewport - Product's document scrollport, excluding its outline and toolbars.
 * @param surface - Public mounted content surface.
 * @returns Whether this is an unmodified primary mouse press in the side blank space.
 */
export function canStartEditorBlockMarquee(event: PointerEvent, viewport: HTMLElement, surface: HTMLElement): boolean {
  if (event.defaultPrevented || event.button !== 0 || event.isPrimary === false || event.pointerType === "touch"
    || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false;
  const target = event.target;
  if (!(target instanceof Element) || !viewport.contains(target)
    || target.closest('button,input,textarea,select,a,[role="button"],[role="menu"],[data-editor-anchored-overlay]')) return false;
  const column = surface.getBoundingClientRect(), boundary = viewport.getBoundingClientRect();
  // The scrollbars keep their native ownership even when they sit outside the
  // text column. Admission uses the scrollport's inner client box, not its border box.
  const left = boundary.left + viewport.clientLeft, top = boundary.top + viewport.clientTop;
  return event.clientY >= Math.max(column.top, top) && event.clientY < top + viewport.clientHeight
    && event.clientX >= left && event.clientX < left + viewport.clientWidth
    && (event.clientX < column.left || event.clientX > column.right);
}
