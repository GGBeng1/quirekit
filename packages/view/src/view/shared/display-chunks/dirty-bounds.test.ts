import type { QuireDisplayCommand, QuireImageCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import { readQuireDisplayChunkDisplayCommandDirtyBounds } from "@quirekit/view-engine";

describe("display chunk dirty bounds", () => {
  it("includes transformed image pixels outside the accepted destination frame", () => {
    const command: QuireImageCommand = {
      id: "rotated-picture",
      kind: "image",
      rect: { x: 100, y: 100, width: 100, height: 20 },
      transform: {
        rotation: 90,
        flipHorizontal: false,
        flipVertical: false
      }
    };

    expect(readQuireDisplayChunkDisplayCommandDirtyBounds(
      command,
      { x: 0, y: 0, width: 240, height: 240 }
    )).toEqual({
      x: 140,
      y: 60,
      width: 20,
      height: 100
    });
  });

  it("invalidates the full viewport when command bounds are unknown", () => {
    const viewportRect = { x: 10, y: 20, width: 240, height: 160 };

    expect(readQuireDisplayChunkDisplayCommandDirtyBounds(
      {
        id: "runtime-widget",
        kind: "runtime-widget"
      } as unknown as QuireDisplayCommand,
      viewportRect
    )).toBe(viewportRect);
  });
});
