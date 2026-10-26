import { describe, expect, it } from "vitest";
import type {
  QuireViewLayerHitCandidate,
  QuireViewLayerRef
} from "../types";
import {
  compareQuireViewLayerHitCandidates,
  resolveDefaultQuireViewPointerPolicyForLayer,
} from "./policy";

describe("view graph layer policy", () => {
  it("orders layer hit candidates from topmost plane to most specific content", () => {
    const contentLayer: QuireViewLayerRef = { plane: "content" };
    const selectionLayer: QuireViewLayerRef = { plane: "selection" };
    const controlLayer: QuireViewLayerRef = { plane: "controls" };

    expect(
      [
        createCandidate("content-large", contentLayer, 400),
        createCandidate("selection-overlay", selectionLayer, 400),
        createCandidate("control-handle", controlLayer, 25),
        createCandidate("content-small", contentLayer, 25)
      ]
        .sort(compareQuireViewLayerHitCandidates)
        .map((candidate) => candidate.targetId)
    ).toEqual([
      "control-handle",
      "selection-overlay",
      "content-small",
      "content-large"
    ]);
  });

  it("resolves default pointer policies from layer planes", () => {
    expect(
      resolveDefaultQuireViewPointerPolicyForLayer({ plane: "content" }).kind
    ).toBe("select");
    expect(
      resolveDefaultQuireViewPointerPolicyForLayer({ plane: "selection" }).kind
    ).toBe("pass-through");
    expect(
      resolveDefaultQuireViewPointerPolicyForLayer({ plane: "controls" }).kind
    ).toBe("dispatch");
    expect(
      resolveDefaultQuireViewPointerPolicyForLayer({ plane: "dom-proxy" }).kind
    ).toBe("dispatch");
  });
});

/**
 * Creates one layer hit candidate for ordering tests.
 *
 * @param targetId - Stable target id represented by the candidate.
 * @param layer - Retained layer owned by the candidate.
 * @param area - Rectangle area represented by the candidate.
 * @returns Layer hit candidate for ordering tests.
 */
function createCandidate(
  targetId: string,
  layer: QuireViewLayerRef,
  area: number
): QuireViewLayerHitCandidate {
  return {
    targetId,
    layer,
    pointerPolicy: resolveDefaultQuireViewPointerPolicyForLayer(layer),
    rect: { x: 0, y: 0, width: area, height: 1 }
  };
}
