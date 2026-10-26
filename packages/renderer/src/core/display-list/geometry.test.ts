import { describe, expect, it } from "vitest";
import {
  createQuireRoundedRectPathSegments,
  filterQuireDisplayListToRect,
  readQuireDisplayCommandPaintBounds,
  type QuireDisplayCommand
} from "./index";

describe("display-list geometry authority", () => {
  it("creates one deterministic clockwise rounded-rectangle path", () => {
    expect(createQuireRoundedRectPathSegments(
      { x: 10, y: 20, width: 40, height: 20 },
      20
    )).toEqual([
      { kind: "move-to", point: { x: 20, y: 20 } },
      { kind: "line-to", point: { x: 40, y: 20 } },
      {
        kind: "quadratic-curve-to",
        control: { x: 50, y: 20 },
        point: { x: 50, y: 30 }
      },
      { kind: "line-to", point: { x: 50, y: 30 } },
      {
        kind: "quadratic-curve-to",
        control: { x: 50, y: 40 },
        point: { x: 40, y: 40 }
      },
      { kind: "line-to", point: { x: 20, y: 40 } },
      {
        kind: "quadratic-curve-to",
        control: { x: 10, y: 40 },
        point: { x: 10, y: 30 }
      },
      { kind: "line-to", point: { x: 10, y: 30 } },
      {
        kind: "quadratic-curve-to",
        control: { x: 10, y: 20 },
        point: { x: 20, y: 20 }
      },
      { kind: "close-path" }
    ]);
  });

  it("normalizes invalid radii and rejects invalid rectangles", () => {
    const square = createQuireRoundedRectPathSegments(
      { x: 0, y: 0, width: 10, height: 10 },
      Number.NaN
    );
    expect(square[0]).toEqual({ kind: "move-to", point: { x: 0, y: 0 } });
    expect(createQuireRoundedRectPathSegments(
      { x: 0, y: 0, width: 10, height: 10 },
      -1
    )[0]).toEqual({ kind: "move-to", point: { x: 0, y: 0 } });
    expect(createQuireRoundedRectPathSegments(
      { x: 0, y: 0, width: -10, height: 10 },
      2
    )).toEqual([]);
    expect(createQuireRoundedRectPathSegments(
      { x: 0, y: 0, width: 0, height: 10 },
      2
    )).toEqual([]);
  });

  it.each([
    [
      "rectangle",
      { id: "rect", kind: "fill-rect", rect: { x: 1, y: 2, width: 3, height: 4 }, fillStyle: "#000" }
    ],
    [
      "clip visual bounds",
      {
        id: "clip",
        kind: "clip",
        rect: { x: 1, y: 2, width: 3, height: 4 },
        visualBounds: { x: -2, y: -3, width: 9, height: 10 },
        commands: []
      }
    ]
  ] satisfies readonly [string, QuireDisplayCommand][]) (
    "reads %s paint bounds",
    (_label, command) => {
      expect(readQuireDisplayCommandPaintBounds(command)).toEqual(
        command.kind === "clip" ? command.visualBounds : command.rect
      );
    }
  );

  it("expands stroked line bounds", () => {
    expect(readQuireDisplayCommandPaintBounds({
      id: "line",
      kind: "line",
      from: { x: 10, y: 20 },
      to: { x: 30, y: 10 },
      strokeStyle: "#000",
      lineWidth: 4
    })).toEqual({ x: 8, y: 8, width: 24, height: 14 });
  });

  it("reads transformed image paint bounds", () => {
    expect(readQuireDisplayCommandPaintBounds({
      id: "image",
      kind: "image",
      rect: { x: 100, y: 100, width: 100, height: 20 },
      transform: {
        rotation: 90,
        flipHorizontal: false,
        flipVertical: false
      }
    })).toEqual({ x: 140, y: 60, width: 20, height: 100 });
  });

  it("returns null for invalid runtime geometry", () => {
    expect(readQuireDisplayCommandPaintBounds({
      id: "bad-path",
      kind: "path",
      rect: { x: Number.NaN, y: 0, width: 10, height: 10 },
      segments: []
    })).toBeNull();
    expect(readQuireDisplayCommandPaintBounds({
      id: "bad-line",
      kind: "line",
      from: { x: 0, y: 0 },
      to: { x: 10, y: 10 },
      strokeStyle: "#000",
      lineWidth: -1
    })).toBeNull();
    expect(readQuireDisplayCommandPaintBounds({
      id: "bad-image-transform",
      kind: "image",
      rect: { x: 0, y: 0, width: 10, height: 10 },
      transform: {
        rotation: Number.NaN,
        flipHorizontal: false,
        flipVertical: false
      }
    })).toBeNull();
    expect(readQuireDisplayCommandPaintBounds({
      id: "missing-rect",
      kind: "path",
      segments: []
    } as unknown as QuireDisplayCommand)).toBeNull();
    expect(readQuireDisplayCommandPaintBounds({
      id: "missing-line-origin",
      kind: "line",
      to: { x: 10, y: 10 },
      strokeStyle: "#000",
      lineWidth: 1
    } as unknown as QuireDisplayCommand)).toBeNull();
    expect(readQuireDisplayCommandPaintBounds({
      id: "unknown-command",
      kind: "runtime-widget"
    } as unknown as QuireDisplayCommand)).toBeNull();
    expect(readQuireDisplayCommandPaintBounds(null)).toBeNull();
  });

  it("retains commands with unknown bounds during conservative filtering", () => {
    const command = {
      id: "runtime-widget",
      kind: "runtime-widget"
    } as unknown as QuireDisplayCommand;

    expect(filterQuireDisplayListToRect({
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      commands: [command]
    }, { x: 0, y: 0, width: 10, height: 10 }).commands).toEqual([command]);
  });
});
