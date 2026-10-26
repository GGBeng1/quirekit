import type { QuireDisplayCommand } from "../core/display-list";
import { describe, expect, it } from "vitest";
import { translateQuireDisplayCommand } from "./translate-command";

describe("display command translation", () => {
  it("translates every geometry-bearing command without changing stable ids", () => {
    const commands = createCommands();

    expect(commands.map((command) =>
      translateQuireDisplayCommand(command, 7, -3)
    )).toEqual([
      { ...commands[0], rect: { x: 8, y: -1, width: 3, height: 4 } },
      {
        ...commands[1],
        rect: { x: 8, y: -1, width: 3, height: 4 },
        origin: { x: 9, y: 0 }
      },
      {
        ...commands[2],
        rect: { x: 8, y: -1, width: 3, height: 4 },
        origin: { x: 9, y: 0 }
      },
      { ...commands[3], rect: { x: 8, y: -1, width: 3, height: 4 } },
      {
        ...commands[4],
        from: { x: 8, y: -1 },
        to: { x: 10, y: 1 }
      },
      {
        ...commands[5],
        rect: { x: 8, y: -1, width: 3, height: 4 },
        segments: [
          { kind: "move-to", point: { x: 8, y: -1 } },
          { kind: "line-to", point: { x: 9, y: 0 } },
          {
            kind: "quadratic-curve-to",
            control: { x: 10, y: 1 },
            point: { x: 11, y: 2 }
          },
          {
            kind: "bezier-curve-to",
            control1: { x: 12, y: 3 },
            control2: { x: 13, y: 4 },
            point: { x: 14, y: 5 }
          },
          { kind: "close-path" }
        ]
      },
      { ...commands[6], rect: { x: 8, y: -1, width: 3, height: 4 } },
      {
        ...commands[7],
        rect: { x: 8, y: -1, width: 3, height: 4 },
        transform: {
          a: 0,
          b: 1,
          c: -1,
          d: 0,
          e: 10.5,
          f: -8.5
        },
        visualBounds: { x: 7, y: -2, width: 6, height: 5 },
        commands: [{
          ...commands[0],
          rect: { x: 8, y: -1, width: 3, height: 4 }
        }]
      }
    ]);
  });

  it("returns the original immutable command when the delta is zero", () => {
    const command = createCommands()[0]!;

    expect(translateQuireDisplayCommand(command, 0, 0)).toBe(command);
  });
});

/**
 * Creates one fixture for every display-command geometry shape.
 *
 * @returns Ordered renderer-neutral command fixtures.
 */
function createCommands(): readonly QuireDisplayCommand[] {
  const rect = { x: 1, y: 2, width: 3, height: 4 };
  const fill: QuireDisplayCommand = {
    id: "fill",
    kind: "fill-rect",
    rect,
    fillStyle: "#000"
  };
  return [
    fill,
    {
      id: "text",
      kind: "text",
      rect,
      text: "A",
      origin: { x: 2, y: 3 },
      font: "12px sans-serif",
      fillStyle: "#000"
    },
    {
      id: "glyph",
      kind: "glyph-run",
      rect,
      text: "A",
      origin: { x: 2, y: 3 },
      font: "12px sans-serif",
      fillStyle: "#000",
      glyphCoverage: "complete",
      glyphs: []
    },
    { id: "caret", kind: "caret", rect, fillStyle: "#000" },
    {
      id: "line",
      kind: "line",
      from: { x: 1, y: 2 },
      to: { x: 3, y: 4 },
      strokeStyle: "#000",
      lineWidth: 1
    },
    {
      id: "path",
      kind: "path",
      rect,
      segments: [
        { kind: "move-to", point: { x: 1, y: 2 } },
        { kind: "line-to", point: { x: 2, y: 3 } },
        {
          kind: "quadratic-curve-to",
          control: { x: 3, y: 4 },
          point: { x: 4, y: 5 }
        },
        {
          kind: "bezier-curve-to",
          control1: { x: 5, y: 6 },
          control2: { x: 6, y: 7 },
          point: { x: 7, y: 8 }
        },
        { kind: "close-path" }
      ]
    },
    { id: "image", kind: "image", rect, href: "image.png" },
    {
      id: "clip",
      kind: "clip",
      rect,
      transform: { a: 0, b: 1, c: -1, d: 0, e: 6.5, f: 1.5 },
      visualBounds: { x: 0, y: 1, width: 6, height: 5 },
      commands: [fill]
    }
  ];
}
