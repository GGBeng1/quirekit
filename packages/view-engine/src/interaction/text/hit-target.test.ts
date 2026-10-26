import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../layout";
import { mapQuireEditableTextHitTargetPointToCaret } from "./hit-target";

describe("retained target text ownership", () => {
  it("never borrows overlapping text from a different document range", () => {
    const result = mapQuireEditableTextHitTargetPointToCaret({
      nodes: [textNode(100), textNode(0)],
      range: { from: 2, to: 8 },
      rect: { x: 10, y: 0, width: 60, height: 24 },
      point: { x: 40, y: 12 }
    });
    expect(result?.position.pos).toBe(5);
  });

  it("does not activate a paint-only story through an exact range target", () => {
    expect(mapQuireEditableTextHitTargetPointToCaret({
      nodes: [textNode(0, "paint-only")],
      range: { from: 0, to: 10 },
      rect: { x: 0, y: 0, width: 80, height: 24 },
      point: { x: 40, y: 12 }
    })).toBeNull();
  });

  it("still reads source geometry inside its accepted target range", () => {
    expect(mapQuireEditableTextHitTargetPointToCaret({
      nodes: [textNode(0, "source-geometry")],
      range: { from: 0, to: 10 },
      rect: { x: 0, y: 0, width: 80, height: 24 },
      point: { x: 40, y: 12 }
    })?.position.pos).toBe(5);
  });
});

/** @param from - Independent story start. @param role - Retained interaction role. @returns Overlapping measured text with distinct document positions. */
function textNode(from: number, role?: QuireLayoutNode["interactionRole"]): QuireLayoutNode {
  const rect = { x: 0, y: 0, width: 80, height: 24 };
  return {
    id: `text-${from}`, kind: "block", range: { from, to: from + 10 }, rect,
    ...(role === undefined ? {} : { interactionRole: role }),
    textFragments: [{
      id: `fragment-${from}`, text: "abcdefgh", range: { from: from + 1, to: from + 9 },
      rect, font: "16px sans-serif", lineHeight: 24, baseline: 18,
      caretStops: [
        { position: { pos: from + 1, bias: 1 }, localX: 0 },
        { position: { pos: from + 5, bias: 0 }, localX: 40 },
        { position: { pos: from + 9, bias: -1 }, localX: 80 }
      ]
    }]
  };
}
