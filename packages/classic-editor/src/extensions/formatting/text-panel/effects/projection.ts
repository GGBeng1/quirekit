import type { QuireMarkCanvasStyle } from "@quirekit/core";
import { resolveQuireCanvasGlyphEffects } from "@quirekit/core";
import type { TextEffectState } from "./types";

/** Stable paint order shared by the four controls. */
export const textEffects = ["outline", "shadow", "emboss", "imprint"] as const;

/** @param styles - Shared per-segment style deltas. @returns All four values without another style resolution. */
export function projectTextEffects(styles: readonly (readonly QuireMarkCanvasStyle[])[]): TextEffectState {
  const samples = styles.map(deltas => resolveQuireCanvasGlyphEffects(deltas) ?? []);
  return Object.fromEntries(textEffects.map(key => {
    const first = samples[0]?.includes(key) ?? false;
    return [key, samples.every(sample => sample.includes(key) === first) ? first : undefined];
  })) as TextEffectState;
}
