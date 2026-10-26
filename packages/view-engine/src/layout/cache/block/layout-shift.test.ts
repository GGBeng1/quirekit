import { describe, expect, it } from "vitest";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type { QuireLayoutBox } from "../../engine/types";
import { shiftCanvasLeafBlockLayoutBox } from "./layout-shift";

describe("stable block layout shift", () => {
  it("moves inline source identity with its retained leaf range", () => {
    const input: QuireBlockLayoutInput = {
      id: "paragraph-attachment",
      range: { from: 20, to: 32 },
      layoutSignature: "attachment-layout"
    };
    const box: QuireLayoutBox = {
      id: input.id,
      range: { from: 10, to: 22 },
      rect: { x: 40, y: 60, width: 300, height: 24 },
      sourceAnchors: [{
        id: "paragraph-attachment:inline-source:4:attachment",
        nodeType: "attachment",
        range: { from: 15, to: 16 },
        position: { pos: 15, bias: 1 },
        affinity: "before"
      }]
    };

    expect(shiftCanvasLeafBlockLayoutBox(box, input, 30, 10)).toMatchObject({
      range: { from: 20, to: 32 },
      rect: { x: 40, y: 90, width: 300, height: 24 },
      sourceAnchors: [{
        id: "paragraph-attachment:inline-source:4:attachment",
        range: { from: 25, to: 26 },
        position: { pos: 25, bias: 1 }
      }]
    });
  });
});
