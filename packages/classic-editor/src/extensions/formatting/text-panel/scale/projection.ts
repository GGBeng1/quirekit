import type { QuireMarkCanvasStyle } from "@quirekit/core";

/**
 * Projects the effective width percentage of the selected text.
 * @param styles - Inherited and direct deltas for each selected segment.
 * @returns Uniform percentage or null for mixed selection.
 */
export function projectTextScale(styles: readonly (readonly QuireMarkCanvasStyle[])[]): number | null {
  const values = styles.map(deltas => {
    let ratio = 1;
    for (const delta of deltas) if (delta.horizontalScale !== undefined) ratio = delta.horizontalScale;
    return Math.round(ratio * 100);
  });
  const first = values[0] ?? 100;
  return values.every(value => value === first) ? first : null;
}
