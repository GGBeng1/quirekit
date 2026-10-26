import type { StaticShortcut } from "@unocss/core";

/**
 * Keeps calendar geometry independent of its input while reusing semantic tokens.
 * Both densities preserve legible typography; only date-cell spacing changes.
 * @param prefix - Calendar root or popup recipe prefix.
 * @returns Two panel density projections for inline and portalled calendars.
 */
export function calendarDensityShortcuts(prefix: string): StaticShortcut[] {
  return Object.entries({ compact: "default", comfortable: "regular" }).map(([density, height]) => [
    `${prefix}--${density}`,
    [{
      "--qk-calendar-cell-size": `var(--qk-control-${height})`,
      "font-size": "var(--qk-type-control-font-size)",
      "line-height": "var(--qk-type-control-line-height)"
    }],
    { layer: "qk-recipes" }
  ]);
}
