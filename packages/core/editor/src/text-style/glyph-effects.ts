import type { QuireMarkCanvasStyle } from "../types";

const glyphEffects = ["outline", "shadow", "emboss", "imprint"] as const;

/**
 * Folds complete effect sets and independent overrides in inheritance order.
 * @param deltas - Canvas style deltas, from inherited to direct formatting.
 * @returns Effective effects, retaining undefined for an undeclared value.
 */
export function resolveQuireCanvasGlyphEffects(
  deltas: readonly (QuireMarkCanvasStyle | null | undefined)[]
): QuireMarkCanvasStyle["glyphEffects"] {
  let effects: QuireMarkCanvasStyle["glyphEffects"];
  for (const delta of deltas) {
    if (Array.isArray(delta?.glyphEffects)) {
      effects = delta.glyphEffects.filter(effect => glyphEffects.includes(effect));
    }
    if (delta?.glyphEffectOverrides) {
      // Independent overrides retain inherited peers in canonical paint order.
      effects = glyphEffects.filter(effect =>
        delta.glyphEffectOverrides?.[effect] ?? effects?.includes(effect) ?? false);
    }
  }
  return effects;
}
