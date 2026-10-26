import {
  splitQuireDisplayListLayers,
  type QuireDisplayList
} from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  createQuireDisplayListLayerCollector,
  resolveQuireDisplayCommandPaintSurface
} from "./layers";

describe("createQuireDisplayListLayerCollector", () => {
  it("matches the finished-list layer splitter", () => {
    const displayList: QuireDisplayList = {
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      commands: [
        {
          id: "background",
          kind: "fill-rect",
          rect: { x: 0, y: 0, width: 100, height: 80 },
          fillStyle: "#fff"
        },
        {
          id: "selection",
          kind: "fill-rect",
          layer: "overlay",
          rect: { x: 10, y: 10, width: 40, height: 12 },
          fillStyle: "rgba(59,130,246,0.25)"
        },
        {
          id: "text",
          kind: "text",
          rect: { x: 10, y: 10, width: 40, height: 12 },
          text: "text",
          origin: { x: 10, y: 20 },
          font: "16px sans-serif",
          fillStyle: "#111"
        }
      ]
    };
    const collector = createQuireDisplayListLayerCollector();

    for (const command of displayList.commands) {
      collector.observe(command);
    }

    expect(collector.finish(displayList.bounds)).toEqual(
      splitQuireDisplayListLayers(displayList)
    );
  });

  it("resolves the display-list paint surface as a last-mile paint target", () => {
    expect(resolveQuireDisplayCommandPaintSurface({
      id: "text",
      kind: "text",
      rect: { x: 10, y: 10, width: 40, height: 12 },
      text: "text",
      origin: { x: 10, y: 20 },
      font: "16px sans-serif",
      fillStyle: "#111"
    })).toBe("content");
    expect(resolveQuireDisplayCommandPaintSurface({
      id: "selection",
      kind: "fill-rect",
      layer: "overlay",
      rect: { x: 10, y: 10, width: 40, height: 12 },
      fillStyle: "rgba(59,130,246,0.25)"
    })).toBe("overlay");
  });
});
