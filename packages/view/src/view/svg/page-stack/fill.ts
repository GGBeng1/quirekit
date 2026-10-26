import { createMountedPageStackFillLifecycle } from "../../shared/page-stack/fill/policy";
import type { QuirePageStackFillPresentationLifecycle } from "../../shared";
import type { CreateSvgPageStackFillLifecycleOptions } from "./types";

/**
 * Applies the existing Svg fill policy to the shared presentation lifecycle.
 * @param options - Mounted root, runtime policy, and backend fill capabilities.
 * @returns Presentation-owned fill lifecycle.
 */
export function createSvgPageStackFillLifecycle(
  options: CreateSvgPageStackFillLifecycleOptions
): QuirePageStackFillPresentationLifecycle {
  return createMountedPageStackFillLifecycle(options, true, () => options.runtime?.textMeasurementBackend === "browser");
}
