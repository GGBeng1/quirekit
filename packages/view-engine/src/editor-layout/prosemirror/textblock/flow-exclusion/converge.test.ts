import type { QuireTextFragment } from "@quirekit/layout/text";
import { describe, expect, it, vi } from "vitest";
import { convergeQuireTextblockFlowShape } from "./converge";
import type { QuireTextblockFlowSlots } from "./types";

const baseline = [createFragment("baseline")];

describe("textblock flow exclusion convergence", () => {
  it("accepts only a slot signature reproduced by its shaped fragments", () => {
    const shape = vi.fn(() => [createFragment("stable")]);
    const result = convergeQuireTextblockFlowShape({
      baselineFragments: baseline,
      maxPasses: 4,
      resolveSlots: () => createSlots("0:60,140:60"),
      shape
    });

    expect(result).toEqual({
      status: "resolved",
      fragments: [createFragment("stable")],
      flowSlots: createSlots("0:60,140:60")
    });
    expect(shape).toHaveBeenCalledTimes(1);
  });

  it("returns the baseline and participants when signatures keep oscillating", () => {
    let resolveCount = 0;
    const result = convergeQuireTextblockFlowShape({
      baselineFragments: baseline,
      maxPasses: 4,
      resolveSlots: () => createSlots(resolveCount++ % 2 === 0 ? "left" : "right"),
      shape: () => [createFragment("unstable")]
    });

    expect(result).toEqual({
      status: "non-convergent",
      fragments: baseline,
      participants: [{ sourceAnchorId: "anchor-1", objectId: "object-1" }],
      signatures: [
        "left", "right",
        "right", "left",
        "left", "right",
        "right", "left"
      ]
    });
  });
});

/**
 * Creates one minimal fragment for convergence control-flow tests.
 *
 * @param text - Text identifying the producing pass.
 * @returns Minimal measured fragment.
 */
function createFragment(text: string): QuireTextFragment {
  return {
    id: `fragment:${text}`,
    text,
    range: { from: 1, to: 1 + text.length },
    rect: { x: 0, y: 0, width: text.length * 10, height: 20 },
    font: "16px sans-serif",
    lineHeight: 20,
    baseline: 15,
    caretStops: []
  };
}

/**
 * Creates one slot result with a stable participant.
 *
 * @param signature - Signature observed by the convergence loop.
 * @returns Minimal flow-slot result.
 */
function createSlots(signature: string): QuireTextblockFlowSlots {
  return {
    lineSlots: [[{ x: 0, width: 60 }]],
    signature,
    participants: [{ sourceAnchorId: "anchor-1", objectId: "object-1" }]
  };
}
