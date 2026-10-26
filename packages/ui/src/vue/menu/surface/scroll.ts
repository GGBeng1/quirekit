import { watch, type ComponentPublicInstance } from "vue";

/** @param content - Mounted menu navigation surface. */
export function revealNestedMenuItem(content: HTMLElement): void {
  if (!content.isConnected) return;
  const id = content.getAttribute("aria-activedescendant");
  const item = id && content.ownerDocument.getElementById(id);
  if (!item || !content.contains(item)) return;
  // Ark handles the menu surface itself. Only reveal inner scroll owners here;
  // scrolling the page would detach a fixed menu from its captured source block.
  for (let parent = item.parentElement; parent && parent !== content; parent = parent.parentElement) {
    if (parent.scrollHeight <= parent.clientHeight || !/(auto|scroll)/u.test(getComputedStyle(parent).overflowY)) continue;
    const bounds = parent.getBoundingClientRect(), row = item.getBoundingClientRect();
    const top = bounds.top + parent.clientTop, bottom = top + parent.clientHeight;
    const delta = row.top < top ? row.top - top : row.bottom > bottom ? row.bottom - bottom : 0;
    if (delta) parent.scrollTop += delta;
  }
}

/** @param content - Lazy menu surface, absent when dismissed. @param open - Accepted menu visibility. */
export function useNestedMenuScroll(content: () => ComponentPublicInstance | HTMLElement | undefined, open: () => boolean): void {
  watch([content, open], ([instance, visible], _previous, cleanup) => {
    if (!visible) return;
    const element = instance && ("$el" in instance ? instance.$el as HTMLElement : instance);
    if (!element || element.nodeType !== 1) return;
    // Observe one accepted ARIA value, never the menu subtree or document.
    // This also covers typeahead and avoids competing with Ark's key handling.
    const Observer = element.ownerDocument.defaultView?.MutationObserver;
    if (!Observer) return;
    const observer = new Observer(() => revealNestedMenuItem(element));
    observer.observe(element, { attributes: true, attributeFilter: ["aria-activedescendant"] });
    cleanup(() => observer.disconnect());
    revealNestedMenuItem(element);
  }, { flush: "post", immediate: true });
}
