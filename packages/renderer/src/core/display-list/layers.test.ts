import { describe, expect, it } from "vitest";
import type { QuireDisplayList } from "@quirekit/render-contract";
import { splitQuireDisplayListLayers } from "./layers";

describe("canvas display list layers", () => {
  it("splits overlay commands from persistent content commands", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 10, y: 20, width: 200, height: 80 },
      commands: [
        {
          id: "document-background",
          kind: "fill-rect",
          rect: { x: 10, y: 20, width: 200, height: 80 },
          fillStyle: "#fff"
        },
        {
          id: "selection-range-0",
          kind: "fill-rect",
          layer: "overlay",
          rect: { x: 20, y: 30, width: 40, height: 20 },
          fillStyle: "#bfdbfe"
        },
        {
          id: "paragraph-0:text",
          kind: "text",
          rect: { x: 10, y: 20, width: 120, height: 24 },
          text: "Hello",
          origin: { x: 10, y: 38 },
          font: "16px sans-serif",
          fillStyle: "#111"
        },
        {
          id: "caret-0",
          kind: "caret",
          layer: "overlay",
          rect: { x: 60, y: 20, width: 1, height: 24 },
          fillStyle: "#111"
        }
      ]
    };

    expect(splitQuireDisplayListLayers(displayList)).toEqual({
      content: {
        bounds: displayList.bounds,
        commands: [
          displayList.commands[0],
          displayList.commands[2]
        ]
      },
      overlay: {
        bounds: displayList.bounds,
        commands: [
          displayList.commands[1],
          displayList.commands[3]
        ]
      }
    });
  });
});
