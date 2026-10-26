import { describe, expect, it } from "vitest";
import { projectQuireRenderParityPaint } from "./paint";
import { serializeQuireRenderParityFacts } from "./serialize";

describe("render parity gaps", () => {
  it("rejects live image sources without a portable href", () => {
    const projection = projectQuireRenderParityPaint({
      bounds: { x: 0, y: 0, width: 20, height: 20 },
      commands: [{
        id: "image-0",
        kind: "image",
        rect: { x: 0, y: 0, width: 20, height: 20 },
        source: {} as CanvasImageSource
      }]
    }, "content");

    expect(projection.gaps).toEqual([
      expect.objectContaining({
        code: "non-portable-image-source",
        area: "paint",
        path: "content.commands[0].source"
      })
    ]);
  });

  it("rejects non-plain live values instead of inventing stable identity", () => {
    class LiveResource {}
    const serialized = serializeQuireRenderParityFacts("interaction", {
      resource: new LiveResource()
    });

    expect(serialized.gaps).toEqual([
      expect.objectContaining({
        code: "non-serializable-fact",
        path: "$.resource"
      })
    ]);
  });
});
