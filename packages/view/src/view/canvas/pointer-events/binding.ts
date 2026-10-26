import type { BindCanvasMountedPointerEventsOptions } from "./types";
import { bindCanvasMountedPointerSession } from "./session-options";

/**
 * Binds pointer events owned by the mounted Canvas coordinate surface.
 *
 * @param options - Canvas surfaces, hit-test adapter, and mounted lifecycle hooks.
 * @returns Cleanup for the shared mounted pointer session.
 */
export function bindCanvasMountedPointerEvents(
  options: BindCanvasMountedPointerEventsOptions
): () => void {
  return bindCanvasMountedPointerSession(options);
}
