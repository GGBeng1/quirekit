import type { BindSvgMountedPointerEventsOptions } from "./types";
import { bindSvgMountedPointerSession } from "./session-options";

/**
 * Binds pointer events owned by the mounted SVG coordinate surface.
 *
 * @param options - SVG surfaces, hit-test adapter, and mounted lifecycle hooks.
 * @returns Cleanup for the shared mounted pointer session.
 */
export function bindSvgMountedPointerEvents(
  options: BindSvgMountedPointerEventsOptions
): () => void {
  return bindSvgMountedPointerSession(options);
}
