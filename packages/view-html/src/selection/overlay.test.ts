import type { QuireDisplayList } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { createHtmlAuxiliaryOverlayDisplayList } from "./overlay";

describe("retained HTML auxiliary overlay", () => {
  it("removes model selection recursively while preserving other overlay layers", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      commands: [
        {
          id: "selection-range-0",
          kind: "fill-rect",
          rect: { x: 1, y: 2, width: 3, height: 4 },
          fillStyle: "#bfdbfe"
        },
        {
          id: "review-highlight",
          kind: "fill-rect",
          rect: { x: 5, y: 6, width: 7, height: 8 },
          fillStyle: "#fde68a"
        },
        {
          id: "clipped",
          kind: "clip",
          rect: { x: 0, y: 0, width: 50, height: 50 },
          commands: [
            {
              id: "caret-0",
              kind: "caret",
              rect: { x: 9, y: 10, width: 1, height: 18 },
              fillStyle: "#111827"
            }
          ]
        }
      ]
    };

    const result = createHtmlAuxiliaryOverlayDisplayList(
      displayList,
      { x: 0, y: 0, width: 200, height: 160 }
    );

    expect(result.bounds).toEqual({ x: 0, y: 0, width: 200, height: 160 });
    expect(result.commands).toEqual([
      expect.objectContaining({ id: "review-highlight" }),
      expect.objectContaining({ id: "clipped", commands: [] })
    ]);
  });
});
