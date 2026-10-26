import { describe, expect, it } from "vitest";
import type { QuireTextFragment } from "@quirekit/layout/text";
import {
  doesQuireTextFragmentBaselineBelongToFlowBand,
  doesQuireTextFragmentBaselineBelongToRectY,
  doesQuireTextFragmentStartInFlowBand,
  resolveQuireTextFragmentFlowOffsetY
} from "./text-ownership";

describe("pagination text ownership", () => {
  it("keeps body line ownership based on line top while nested ownership uses baseline", () => {
    const fragment = createFragment({ y: 20, height: 16, baseline: 32 });
    const continuationBand = { top: 30, bottom: 46 };

    expect(doesQuireTextFragmentStartInFlowBand(fragment, continuationBand)).toBe(false);
    expect(
      doesQuireTextFragmentBaselineBelongToFlowBand(fragment, continuationBand)
    ).toBe(true);
  });

  it("checks baseline ownership against rectangle vertical bands", () => {
    const fragment = createFragment({ y: 20, height: 16, baseline: 32 });

    expect(
      doesQuireTextFragmentBaselineBelongToRectY(fragment, { y: 24, height: 16 })
    ).toBe(true);
    expect(
      doesQuireTextFragmentBaselineBelongToRectY(fragment, { y: 8, height: 16 })
    ).toBe(false);
  });

  it("rebases nested continuation text when retained ink starts above the clip", () => {
    expect(resolveQuireTextFragmentFlowOffsetY(
      [
        createFragment({ y: 20, height: 16, baseline: 32 }),
        createFragment({ y: 36, height: 16, baseline: 48 })
      ],
      { top: 30, bottom: 60 }
    )).toBe(10);
    expect(resolveQuireTextFragmentFlowOffsetY(
      [createFragment({ y: 36, height: 16, baseline: 48 })],
      { top: 30, bottom: 60 }
    )).toBe(0);
  });
});

/**
 * Creates a text-fragment fixture.
 *
 * @param options - Fragment vertical metrics.
 * @returns Text fragment sufficient for ownership tests.
 */
function createFragment(options: {
  /** Fragment line-box top. */
  readonly y: number;
  /** Fragment line-box height. */
  readonly height: number;
  /** Fragment baseline. */
  readonly baseline: number;
}): QuireTextFragment {
  return {
    id: `fragment-${options.y}`,
    text: "line",
    range: { from: 1, to: 5 },
    rect: { x: 0, y: options.y, width: 20, height: options.height },
    font: "16px test",
    lineHeight: options.height,
    baseline: options.baseline,
    caretStops: []
  };
}
