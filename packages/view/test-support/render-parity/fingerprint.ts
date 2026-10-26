import type { QuireViewRenderResult } from "../../src/view/types";
import {
  projectQuireRenderParityDomOverlayFacts,
  projectQuireRenderParityInteractionFacts,
  projectQuireRenderParityLayoutFacts,
  projectQuireRenderParityOwnershipFacts,
  projectQuireRenderParityPaintFacts
} from "./facts";
import { serializeQuireRenderParityFacts } from "./serialize";
import type {
  QuireRenderParityArea,
  QuireRenderParityFingerprint,
  QuireRenderParityGap
} from "./types";

/** Stable comparison order used by fingerprints and diagnostics. */
export const quireRenderParityAreas: readonly QuireRenderParityArea[] = [
  "layout",
  "interaction",
  "selection",
  "ownership",
  "paint",
  "dom-overlays"
];

/**
 * Creates renderer-neutral parity facts from one converged render result.
 *
 * @param result - Candidate or independent full-reference render result.
 * @returns Versioned canonical fingerprint and explicit comparison gaps.
 */
export function createQuireRenderParityFingerprint(
  result: QuireViewRenderResult
): QuireRenderParityFingerprint {
  const gaps: QuireRenderParityGap[] = [];
  const areaValues: Record<QuireRenderParityArea, unknown> = {
    layout: projectQuireRenderParityLayoutFacts(result),
    interaction: projectQuireRenderParityInteractionFacts(result),
    selection: result.selectionGeometry,
    ownership: projectQuireRenderParityOwnershipFacts(result),
    paint: projectQuireRenderParityPaintFacts(result, gaps),
    "dom-overlays": projectQuireRenderParityDomOverlayFacts(result, gaps)
  };
  const facts = {} as Record<QuireRenderParityArea, string>;

  // Serialize each authority independently so one mismatch remains diagnosable.
  for (const area of quireRenderParityAreas) {
    const serialized = serializeQuireRenderParityFacts(area, areaValues[area]);
    facts[area] = serialized.value;
    gaps.push(...serialized.gaps);
  }

  return { version: 1, facts, gaps };
}
