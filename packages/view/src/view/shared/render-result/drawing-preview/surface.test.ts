import type { QuireDisplayCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import {
  projectMountedDrawingSurfaceCommand,
  projectMountedDrawingSurfaceCommands
} from "./surface";

const acceptedFrame = { x: 100, y: 200, width: 100, height: 50 };
const previewFrame = { x: 40, y: 80, width: 200, height: 150 };

describe("mounted drawing surface projection", () => {
  it("projects rectangle, path, and nested clip geometry without scaling stroke width", () => {
    const commands: readonly QuireDisplayCommand[] = [{
      id: "fill",
      kind: "fill-rect",
      rect: acceptedFrame,
      fillStyle: "#fff"
    }, {
      id: "clip",
      kind: "clip",
      rect: { x: 110, y: 205, width: 80, height: 40 },
      commands: [{
        id: "outline",
        kind: "path",
        rect: acceptedFrame,
        segments: [
          { kind: "move-to", point: { x: 100, y: 200 } },
          { kind: "line-to", point: { x: 200, y: 250 } }
        ],
        strokeStyle: "#000",
        lineWidth: 2
      }]
    }];

    const projected = projectMountedDrawingSurfaceCommands(
      commands,
      acceptedFrame,
      previewFrame
    );

    expect(projected?.[0]).toMatchObject({ rect: previewFrame });
    expect(projected?.[1]).toMatchObject({
      rect: { x: 60, y: 95, width: 160, height: 120 },
      commands: [{
        rect: previewFrame,
        segments: [
          { point: { x: 40, y: 80 } },
          { point: { x: 240, y: 230 } }
        ],
        lineWidth: 2
      }]
    });
  });

  it("rejects text-like shell families instead of scaling glyph metrics", () => {
    const command: QuireDisplayCommand = {
      id: "unexpected-text",
      kind: "text",
      rect: acceptedFrame,
      text: "accepted",
      origin: { x: 100, y: 220 },
      font: "16px sans-serif",
      fillStyle: "#000"
    };

    expect(projectMountedDrawingSurfaceCommand(
      command,
      acceptedFrame,
      previewFrame
    )).toBeUndefined();
  });
});
