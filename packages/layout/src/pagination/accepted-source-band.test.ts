import { describe, expect, it } from "vitest";
import type { QuireMeasuredContainerItem } from "./container";
import { resolveQuireAcceptedSourceFlowBand } from "./accepted-source-band";

describe("pagination accepted source-flow band", () => {
  it("unions accepted measured source-flow item bands", () => {
    expect(resolveQuireAcceptedSourceFlowBand([
      createItem({ id: "before", top: 0, bottom: 12 }),
      createItem({ id: "first", top: 18, bottom: 30 }),
      createItem({ id: "unmeasured" }),
      createItem({ id: "second", top: 30, bottom: 46 }),
      createItem({ id: "after", top: 80, bottom: 90 })
    ], 1, 4)).toEqual({
      top: 18,
      bottom: 46
    });
  });

  it("returns null when no accepted item exposes source-flow coordinates", () => {
    expect(resolveQuireAcceptedSourceFlowBand([
      createItem({ id: "unmeasured" })
    ], 0, 1)).toBeNull();
    expect(resolveQuireAcceptedSourceFlowBand([
      createItem({ id: "empty", top: 0, bottom: 12 })
    ], 0, 0)).toBeNull();
  });
});

/**
 * Creates a measured container item fixture.
 *
 * @param options - Item identity and optional source-flow band.
 * @returns Measured item fixture.
 */
function createItem(options: {
  /** Stable item id. */
  readonly id: string;
  /** Optional source-flow top. */
  readonly top?: number | undefined;
  /** Optional source-flow bottom. */
  readonly bottom?: number | undefined;
}): QuireMeasuredContainerItem {
  return {
    id: options.id,
    range: { from: 1, to: 2 },
    height: Math.max(0, (options.bottom ?? 0) - (options.top ?? 0)),
    canSplit: false,
    ...(options.top === undefined ? {} : { flowTop: options.top }),
    ...(options.bottom === undefined ? {} : { flowBottom: options.bottom })
  };
}
