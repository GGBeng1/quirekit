import { describe, expect, it } from "vitest";
import type { QuireBlockLayoutInput } from "../engine/block-types";
import {
  resolveQuireRetainedFlowLeadingSpacing,
  resolveQuireRetainedProjectedExtraHeight
} from "./flow";

describe("retained block flow spacing", () => {
  it("collapses adjacent paragraph spacing while preserving border insets", () => {
    const current = block({ spacingAfter: 8, blockEndInset: 2 });
    const next = block({ spacingBefore: 5, blockStartInset: 3 });

    expect(resolveQuireRetainedProjectedExtraHeight(current, next)).toBe(13);
  });

  it("includes the first paragraph border inset in leading flow distance", () => {
    expect(resolveQuireRetainedFlowLeadingSpacing([
      block({ spacingBefore: 6, blockStartInset: 2 })
    ])).toBe(8);
  });
});

/**
 * Creates a minimal retained block input fixture.
 *
 * @param overrides - Flow fields under test.
 * @returns Complete block input with stable identity.
 */
function block(
  overrides: Partial<QuireBlockLayoutInput>
): QuireBlockLayoutInput {
  return {
    id: "paragraph",
    range: { from: 0, to: 1 },
    minHeight: 10,
    ...overrides
  };
}
