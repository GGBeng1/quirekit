import { createMountedViewCleanupRegistry } from "./cleanup";
import type { BindMountedResizeEventsOptions } from "./types";

/**
 * Binds browser resize signals for one mounted geometry surface.
 *
 * The backend chooses the geometry-bearing element. This shared lifecycle only
 * owns browser subscription and teardown semantics.
 *
 * @param options - Root, observed geometry element, and invalidation callback.
 * @returns Cleanup for the observer and window listener.
 */
export function bindMountedResizeEvents(
  options: BindMountedResizeEventsOptions
): () => void {
  const cleanup = createMountedViewCleanupRegistry();
  const ownerWindow = options.root.ownerDocument.defaultView;
  const ResizeObserverCtor = ownerWindow?.ResizeObserver;

  if (ResizeObserverCtor) {
    const observer = new ResizeObserverCtor(options.onResize);

    observer.observe(options.observedElement);
    cleanup.add(() => {
      observer.disconnect();
    });
  }

  ownerWindow?.addEventListener("resize", options.onResize);
  cleanup.add(() => {
    ownerWindow?.removeEventListener("resize", options.onResize);
  });

  return () => {
    cleanup.destroy();
  };
}
