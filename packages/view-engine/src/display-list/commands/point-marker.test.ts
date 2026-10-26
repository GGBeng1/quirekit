import type { QuireDisplayCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireDecorationPointVisual } from "../../decorations";
import { appendDecorationPointMarkerCommands } from "./point-marker";

describe("decoration point-marker commands", () => {
  it("paints one outlined speech bubble without persistent fill", () => {
    const commands: QuireDisplayCommand[] = [];
    const marker: QuireDecorationPointVisual = {
      id: "comment-point:8:marker",
      decorationId: "comment-point:8",
      range: { from: 12, to: 12 },
      rect: { x: 40, y: 20, width: 12, height: 12 },
      color: "rgba(37, 99, 235, 0.42)",
      lineWidth: 1.25
    };

    appendDecorationPointMarkerCommands(commands, [marker]);

    expect(commands).toEqual([expect.objectContaining({
      id: "comment-point:8:marker",
      kind: "path",
      layer: "overlay",
      range: { from: 12, to: 12 },
      rect: { x: 40, y: 20, width: 12, height: 12 },
      strokeStyle: "rgba(37, 99, 235, 0.42)",
      lineWidth: 1.25
    })]);
    expect(commands[0]).not.toHaveProperty("fillStyle");
    expect(commands[0]).toMatchObject({
      segments: expect.arrayContaining([
        expect.objectContaining({ kind: "quadratic-curve-to" }),
        expect.objectContaining({ kind: "close-path" })
      ])
    });
  });
});
