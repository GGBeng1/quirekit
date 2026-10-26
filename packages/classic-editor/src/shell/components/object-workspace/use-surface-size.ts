import { onBeforeUnmount, watch, type Ref } from "vue";

/**
 * Measures the actual Toolbar, without observing document layout or selection.
 * @param surface - Existing floating/bottom surface element.
 * @param publish - Receives changed border-box dimensions only.
 */
export function useObjectToolbarSize(surface: Ref<HTMLElement | null>, publish: (size: { width: number; height: number }) => void): void {
  let observer: ResizeObserver | undefined;
  watch(surface, element => {
    observer?.disconnect();
    if (!element) return;
    /** Measures only the mounted Toolbar's border box, never document layout. */
    const measure = (): void => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) publish({ width, height });
    };
    const Constructor = element.ownerDocument.defaultView?.ResizeObserver;
    if (Constructor) { observer = new Constructor(measure); observer.observe(element); }
    measure();
  }, { flush: "post" });
  onBeforeUnmount(() => observer?.disconnect());
}
