import type { QuireMarkCanvasStyle } from "@quirekit/core";

/**
 * Reads visibility without confusing explicit false with inherited or mixed values.
 * @param styles - Shared per-segment style deltas in inheritance order.
 * @returns Uniform hidden state, or undefined for a mixed selection.
 */
export function projectHiddenText(styles: readonly (readonly QuireMarkCanvasStyle[])[]): boolean | undefined {
  const samples = styles.map(deltas => {
    let hidden = false;
    for (const delta of deltas) if (typeof delta.hidden === "boolean") hidden = delta.hidden;
    return hidden;
  });
  const first = samples[0] ?? false;
  return samples.every(value => value === first) ? first : undefined;
}
