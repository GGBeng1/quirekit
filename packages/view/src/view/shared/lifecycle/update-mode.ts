import type { MountedViewUpdateScheduleMode } from "../update-scheduler";
import type { ResolveMountedViewUpdateScheduleModeOptions } from "./types";

/**
 * Resolves the canonical mounted update cadence shared by every backend.
 *
 * Focused content mutations, image pixels and presentation overlays coalesce on
 * the next animation frame. Geometry, selection, scroll, mode, and other unfocused updates stay
 * synchronous so external readers observe the requested state immediately.
 *
 * @param options - Semantic update reason and current focus ownership.
 * @returns Scheduler mode for the mounted update.
 */
export function resolveMountedViewUpdateScheduleMode(
  options: ResolveMountedViewUpdateScheduleModeOptions
): MountedViewUpdateScheduleMode {
  return options.reason === "presentation-overlay" || options.reason === "image-paint" || (
    options.focused &&
    (options.reason === "transaction" || options.reason === "composition")
  )
    ? "frame"
    : "sync";
}
