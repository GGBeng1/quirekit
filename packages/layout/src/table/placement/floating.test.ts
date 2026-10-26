import { describe, expect, it } from "vitest";
import type { QuireTableFloatingPlacement } from "../types";
import { resolveQuireTableFloatingPosition } from "./floating";

const absolutePlacement: QuireTableFloatingPlacement = {
  horizontal: {
    reference: "page",
    offset: 40,
    alignment: null
  },
  vertical: {
    reference: "text",
    offset: 24,
    alignment: null
  },
  clearances: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  wrapMode: null,
  allowOverlap: true
};

describe("resolveQuireTableFloatingPosition", () => {
  it.each(["page", "margin", "text"] as const)("expands the %s reference before offsets, alignment and indentation", (reference) => {
    const rect = { x: 100, y: 200, width: 600, height: 800 };
    const input = {
      pageRect: rect, marginRect: rect, textRect: rect,
      tableRect: { x: 0, y: 0, width: 240, height: 80 }, indent: 6, pageIndex: 0
    };
    for (const [alignment, expected] of [[null, 136], ["start", 96], ["center", 296], ["end", 496], ["inside", 96], ["outside", 496]] as const) {
      const placement = {
        ...absolutePlacement,
        horizontal: { reference, offset: 40, alignment, referenceExpansion: { start: 10, end: 30 } }
      };
      expect(resolveQuireTableFloatingPosition({ ...input, placement })).toEqual({ x: expected, y: 224 });
      if (alignment === "inside" || alignment === "outside") {
        expect(resolveQuireTableFloatingPosition({ ...input, placement, pageIndex: 1 }).x)
          .toBe(alignment === "inside" ? 496 : 96);
      }
    }
  });

  it("resolves absolute offsets against independent page and text references", () => {
    expect(resolveQuireTableFloatingPosition({
      placement: absolutePlacement,
      pageRect: { x: 10, y: 20, width: 800, height: 1_000 },
      marginRect: { x: 110, y: 120, width: 600, height: 800 },
      textRect: { x: 110, y: 260, width: 600, height: 0 },
      tableRect: { x: 0, y: 0, width: 240, height: 80 },
      indent: 6,
      pageIndex: 0
    })).toEqual({
      x: 56,
      y: 284
    });
  });

  it("resolves centered and end alignment against the margin rectangle", () => {
    expect(resolveQuireTableFloatingPosition({
      placement: {
        ...absolutePlacement,
        horizontal: {
          reference: "margin",
          offset: 200,
          alignment: "center"
        },
        vertical: {
          reference: "margin",
          offset: 100,
          alignment: "end"
        }
      },
      pageRect: { x: 0, y: 0, width: 800, height: 1_000 },
      marginRect: { x: 100, y: 120, width: 600, height: 800 },
      textRect: { x: 100, y: 300, width: 600, height: 0 },
      tableRect: { x: 0, y: 0, width: 240, height: 80 },
      indent: 0,
      pageIndex: 0
    })).toEqual({
      x: 280,
      y: 840
    });
  });

  it("maps inside and outside alignment using physical page parity", () => {
    const placement: QuireTableFloatingPlacement = {
      ...absolutePlacement,
      horizontal: {
        reference: "page",
        offset: null,
        alignment: "inside"
      },
      vertical: {
        reference: "page",
        offset: null,
        alignment: "outside"
      }
    };
    const input = {
      placement,
      pageRect: { x: 10, y: 20, width: 800, height: 1_000 },
      marginRect: { x: 110, y: 120, width: 600, height: 800 },
      textRect: { x: 110, y: 300, width: 600, height: 0 },
      tableRect: { x: 0, y: 0, width: 240, height: 80 },
      indent: 0
    };

    expect(resolveQuireTableFloatingPosition({
      ...input,
      pageIndex: 0
    })).toEqual({
      x: 10,
      y: 940
    });
    expect(resolveQuireTableFloatingPosition({
      ...input,
      pageIndex: 1
    })).toEqual({
      x: 570,
      y: 20
    });
  });
});
