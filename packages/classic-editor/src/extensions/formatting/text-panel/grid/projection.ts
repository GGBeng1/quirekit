import type { QuireMarkCanvasStyle } from "@quirekit/core";

/**
 * Reads the inherited grid policy without treating an explicit false as absent.
 * @param styles - Shared selected-segment style cascade.
 * @returns A uniform effective value, or undefined for mixed selections.
 */
export function projectCharacterGrid(styles: readonly (readonly QuireMarkCanvasStyle[])[]): boolean | undefined {
  const samples = styles.map(deltas => {
    let enabled = true;
    for (const delta of deltas) if (typeof delta.characterGrid === "boolean") enabled = delta.characterGrid;
    return enabled;
  });
  const first = samples[0] ?? true;
  return samples.every(value => value === first) ? first : undefined;
}
