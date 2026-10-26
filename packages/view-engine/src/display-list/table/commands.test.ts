import { describe, expect, it } from "vitest";
import { compileQuireTablePaintCommands } from "./commands";
import type { QuireTablePaintModel } from "@quirekit/layout/table";

const model = {
  backgrounds: [
    {
      id: "table-0:background",
      range: { from: 0, to: 20 },
      rect: { x: 10, y: 20, width: 300, height: 56 },
      fillStyle: "#ffffff"
    }
  ],
  contentClips: [
    {
      id: "table-0:cell-0-0:clip",
      semanticCellId: "semantic:r0:c0:g1:1",
      rect: { x: 15, y: 25, width: 140, height: 18 }
    }
  ],
  borders: [
    {
      id: "table-0:border-top-0",
      from: { x: 10, y: 20 },
      to: { x: 310, y: 20 },
      strokeStyle: "#cbd5e1",
      lineWidth: 1,
      lineDash: [3, 2],
      lineCap: "square"
    }
  ]
} satisfies QuireTablePaintModel;

describe("Quire table display commands", () => {
  it("compiles table paint descriptors to existing display commands", () => {
    expect(compileQuireTablePaintCommands(model)).toEqual([
      {
        id: "table-0:background",
        kind: "fill-rect",
        range: { from: 0, to: 20 },
        rect: { x: 10, y: 20, width: 300, height: 56 },
        fillStyle: "#ffffff"
      },
      {
        id: "table-0:cell-0-0:clip",
        kind: "clip",
        rect: { x: 15, y: 25, width: 140, height: 18 },
        commands: []
      },
      {
        id: "table-0:border-top-0",
        kind: "line",
        from: { x: 10, y: 20 },
        to: { x: 310, y: 20 },
        strokeStyle: "#cbd5e1",
        lineWidth: 1,
        lineDash: [3, 2],
        lineCap: "square"
      }
    ]);
  });
});
