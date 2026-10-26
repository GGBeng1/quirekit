import type { QuireTextFragment } from "@quirekit/layout/text";
import { describe, expect, it } from "vitest";
import { resolveQuireTextCaretAnchorCandidate } from "./candidates";

/**
 * Creates deterministic text geometry for caret-candidate tests.
 *
 * @param overrides - Fragment fields that distinguish the test subject.
 * @returns Complete text fragment with stable line metrics.
 */
function createTextFragment(
  overrides: Pick<QuireTextFragment, "id" | "text" | "range" | "rect" | "caretStops">
): QuireTextFragment {
  return {
    ...overrides,
    font: "16px sans-serif",
    lineHeight: 24,
    baseline: 18
  };
}

describe("text caret anchor candidates", () => {
  it("skips a generated zero-stop marker at the editable body start", () => {
    const marker = createTextFragment({
      id: "paragraph-0:word-marker",
      text: "•",
      range: { from: 1, to: 1 },
      rect: { x: 24, y: 0, width: 8, height: 24 },
      caretStops: []
    });
    const body = createTextFragment({
      id: "paragraph-0:text-0",
      text: "body",
      range: { from: 1, to: 5 },
      rect: { x: 48, y: 0, width: 40, height: 24 },
      caretStops: [
        { position: { pos: 1, bias: 1 }, localX: 0 },
        { position: { pos: 5, bias: -1 }, localX: 40 }
      ]
    });

    expect(resolveQuireTextCaretAnchorCandidate({
      fragments: [marker, body],
      ownerRange: { from: 0, to: 6 },
      position: 1,
      side: 1,
      visibleRect: { x: 0, y: 0, width: 160, height: 24 }
    })?.fragment).toBe(body);
  });
});
