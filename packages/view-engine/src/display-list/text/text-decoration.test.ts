import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { appendTextDecorationCommands } from "./text-decoration";

const fragment: QuireTextFragment = {
  id: "fragment",
  text: "small",
  range: { from: 1, to: 6 },
  rect: { x: 10, y: 20, width: 40, height: 34 },
  font: "13px sans-serif",
  lineHeight: 34,
  baseline: 46,
  runAscent: 12,
  runDescent: 4,
  caretStops: [
    { position: { pos: 1, bias: 1 }, localX: 0 },
    { position: { pos: 6, bias: -1 }, localX: 40 }
  ]
};

describe("appendTextDecorationCommands", () => {
  it("positions a strike from the decorated run rather than the tallest line", () => {
    const commands: QuireDisplayCommand[] = [];

    appendTextDecorationCommands(
      commands,
      "fragment",
      fragment,
      fragment.range,
      0,
      fragment.rect.width,
      [{ kind: "strikethrough", color: "#000", width: 1 }]
    );

    expect(commands[0]).toEqual(
      expect.objectContaining({
        kind: "line",
        from: { x: 10, y: 42.49 },
        to: { x: 50, y: 42.49 }
      })
    );
  });

  it("routes additive review lines to the overlay without changing glyph paint", () => {
    const commands: QuireDisplayCommand[] = [];

    appendTextDecorationCommands(
      commands,
      "fragment",
      fragment,
      fragment.range,
      0,
      fragment.rect.width,
      [{
        kind: "underline",
        color: "#008060",
        width: 1.5,
        paintSurface: "overlay"
      }]
    );

    expect(commands).toEqual([
      expect.objectContaining({
        kind: "line",
        layer: "overlay",
        strokeStyle: "#008060",
        lineWidth: 1.5
      })
    ]);
  });

  it("emits two distinct run-local lines for double strikethrough", () => {
    const commands: QuireDisplayCommand[] = [];

    appendTextDecorationCommands(
      commands,
      "fragment",
      fragment,
      fragment.range,
      0,
      fragment.rect.width,
      [{ kind: "strikethrough", color: "#000", width: 1, style: "double" }]
    );

    expect(commands).toEqual([
      expect.objectContaining({
        id: "fragment:text-decoration-0-upper",
        kind: "line",
        from: { x: 10, y: 41.49 },
        to: { x: 50, y: 41.49 }
      }),
      expect.objectContaining({
        id: "fragment:text-decoration-0-lower",
        kind: "line",
        from: { x: 10, y: 43.49 },
        to: { x: 50, y: 43.49 }
      })
    ]);
  });
});
