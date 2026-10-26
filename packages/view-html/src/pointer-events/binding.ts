import type { BindHtmlMountedPointerEventsOptions } from "./types";
import { bindHtmlMountedPointerSession } from "./session-options";

/**
 * Binds pointer events owned by the retained HTML document surface.
 *
 * @param options - HTML surfaces, DOM hit-test adapter, and lifecycle hooks.
 * @returns Cleanup for the shared mounted pointer session.
 */
export function bindHtmlMountedPointerEvents(
  options: BindHtmlMountedPointerEventsOptions
): () => void {
  return bindHtmlMountedPointerSession(options);
}
