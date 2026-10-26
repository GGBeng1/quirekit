import { createMountedPageStackFillLifecycle } from "../../shared/page-stack/fill/policy";
import type { QuirePageStackFillPresentationLifecycle } from "../../shared";
import type { CreateCanvasPageStackFillLifecycleOptions } from "./types";

/**
 * Applies the existing Canvas fill policy to the shared presentation lifecycle.
 * @param options - Mounted root, runtime policy, and backend fill capabilities.
 * @returns Presentation-owned fill lifecycle.
 */
export function createCanvasPageStackFillLifecycle(
  options: CreateCanvasPageStackFillLifecycleOptions
): QuirePageStackFillPresentationLifecycle {
  return createMountedPageStackFillLifecycle(options, false);
}
