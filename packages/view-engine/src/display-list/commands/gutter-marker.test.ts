import {
  renderCanvasDisplayList,
  serializeSvgDisplayListToSvg,
  type Canvas2DRenderTarget,
  type QuireDisplayCommand
} from "@quirekit/renderer";
import { describe, expect, it, vi } from "vitest";
import { appendDecorationGutterMarkerCommands } from "./gutter-marker";

describe("decoration gutter marker commands", () => {
  it("paints identical change-bar semantics through Canvas and serialized SVG", () => {
    const commands: QuireDisplayCommand[] = [];
    appendDecorationGutterMarkerCommands(commands, [{
      id: "revision:change-1:page-0",
      decorationId: "revision-segment-1",
      ownerId: "change-1",
      range: { from: 2, to: 5 },
      rect: { x: 11, y: 20, width: 2, height: 20 },
      color: "#008060",
      lineWidth: 2,
      side: "end",
      tokenSize: 4,
      pageIndex: 0
    }]);
    const target: Canvas2DRenderTarget = {
      fillStyle: "#000000",
      font: "16px sans-serif",
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn()
    };
    const displayList = {
      bounds: { x: 0, y: 0, width: 100, height: 80 },
      commands
    };

    renderCanvasDisplayList({ target, displayList });
    const svg = serializeSvgDisplayListToSvg({ displayList });

    expect(target.moveTo).toHaveBeenCalledWith(12, 20);
    expect(target.lineTo).toHaveBeenCalledWith(12, 40);
    expect(target.strokeStyle).toBe("#008060");
    expect(target.lineWidth).toBe(2);
    expect(target.fillRect).toHaveBeenCalledWith(10, 14, 4, 4);
    expect(svg).toContain(
      '<line x1="12" y1="20" x2="12" y2="40" stroke="#008060" stroke-width="2" stroke-linecap="round" />'
    );
    expect(svg).toContain(
      '<rect x="10" y="14" width="4" height="4" fill="#008060" />'
    );
  });

  it("paints a token-free revision bar as one plain vertical stroke", () => {
    const commands: QuireDisplayCommand[] = [];
    appendDecorationGutterMarkerCommands(commands, [{
      id: "revision:change-2:page-0",
      decorationId: "revision-segment-2",
      ownerId: "change-2",
      range: { from: 5, to: 8 },
      rect: { x: 23, y: 24, width: 2, height: 30 },
      color: "#00806059",
      lineWidth: 2,
      side: "start",
      tokenSize: 0,
      pageIndex: 0
    }]);

    expect(commands).toEqual([
      expect.objectContaining({
        kind: "line",
        from: { x: 24, y: 24 },
        to: { x: 24, y: 54 },
        strokeStyle: "#00806059"
      })
    ]);
  });
});
