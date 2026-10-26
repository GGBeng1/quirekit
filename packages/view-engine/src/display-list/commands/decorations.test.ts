import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand } from "@quirekit/renderer";
import type { QuireDecorationRectVisual } from "../../decorations";
import { resolveDisplayListStyles } from "../styles";
import { appendDecorationBackgroundCommands } from "./decorations";

describe("decoration display commands", () => {
  it("paints an inline background and all four edges of its resolved outline", () => {
    const commands: QuireDisplayCommand[] = [];
    const visual: QuireDecorationRectVisual = {
      id: "content-control:line-1",
      decorationId: "content-control",
      range: { from: 2, to: 8 },
      rect: { x: 10, y: 20, width: 60, height: 18 },
      attrs: {},
      background: "rgba(37, 99, 235, 0.08)",
      keyline: { color: "rgba(37, 99, 235, 0.7)", width: 1.5 },
      outline: { color: "#2563eb", width: 1, style: "dashed" }
    };

    appendDecorationBackgroundCommands(
      commands,
      [visual],
      resolveDisplayListStyles(undefined)
    );

    expect(commands).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "content-control:line-1:fill",
        kind: "fill-rect",
        fillStyle: "rgba(37, 99, 235, 0.08)"
      }),
      expect.objectContaining({
        id: "content-control:line-1:stroke-top",
        kind: "line",
        strokeStyle: "#2563eb",
        lineWidth: 1,
        lineDash: [4, 3]
      }),
      expect.objectContaining({
        id: "content-control:line-1:stroke-right",
        lineDash: [4, 3]
      }),
      expect.objectContaining({
        id: "content-control:line-1:stroke-bottom",
        lineDash: [4, 3]
      }),
      expect.objectContaining({
        id: "content-control:line-1:stroke-left",
        lineDash: [4, 3]
      }),
      expect.objectContaining({
        id: "content-control:line-1:keyline",
        kind: "line",
        strokeStyle: "rgba(37, 99, 235, 0.7)",
        lineWidth: 1.5,
        from: { x: 10, y: 37.25 },
        to: { x: 70, y: 37.25 }
      })
    ]));
  });

  it("projects a checked decoration as one rounded checkbox control", () => {
    const commands: QuireDisplayCommand[] = [];
    const visual: QuireDecorationRectVisual = {
      id: "checkbox:line-1",
      decorationId: "checkbox",
      range: { from: 2, to: 3 },
      rect: { x: 10, y: 20, width: 20, height: 22 },
      attrs: {
        "data-qk-decoration-control": "checkbox",
        "data-qk-decoration-checked": "true"
      },
      background: "transparent"
    };

    appendDecorationBackgroundCommands(
      commands,
      [visual],
      resolveDisplayListStyles(undefined)
    );

    expect(commands).toEqual([
      expect.objectContaining({
        id: "checkbox:line-1:checkbox-background",
        kind: "path",
        layer: "content",
        fillStyle: "#3978f6"
      }),
      expect.objectContaining({
        id: "checkbox:line-1:checkbox-border",
        kind: "path",
        layer: "content",
        strokeStyle: "#3978f6"
      }),
      expect.objectContaining({
        id: "checkbox:line-1:checkbox-check",
        kind: "path",
        layer: "content",
        strokeStyle: "#ffffff"
      })
    ]);
  });

  it("paints a restrained owner bracket without filling its interaction rect", () => {
    const commands: QuireDisplayCommand[] = [];
    const visual: QuireDecorationRectVisual = {
      id: "content-control:owner-handle",
      decorationId: "content-control",
      range: { from: 2, to: 10 },
      rect: { x: 21, y: 20, width: 9, height: 22 },
      attrs: {
        "data-qk-decoration-control-part": "owner-handle",
        "data-qk-decoration-owner-handle-color":
          "rgba(37, 99, 235, 0.72)"
      },
      cursor: "pointer"
    };

    appendDecorationBackgroundCommands(
      commands,
      [visual],
      resolveDisplayListStyles(undefined)
    );

    expect(commands).toHaveLength(3);
    expect(commands).toEqual([
      expect.objectContaining({
        id: "content-control:owner-handle:owner-handle-vertical",
        kind: "line",
        strokeStyle: "rgba(37, 99, 235, 0.72)",
        from: { x: 21.5, y: 24 },
        to: { x: 21.5, y: 38 }
      }),
      expect.objectContaining({
        id: "content-control:owner-handle:owner-handle-top",
        from: { x: 21.5, y: 24 },
        to: { x: 24.5, y: 24 }
      }),
      expect.objectContaining({
        id: "content-control:owner-handle:owner-handle-bottom",
        from: { x: 21.5, y: 38 },
        to: { x: 24.5, y: 38 }
      })
    ]);
    expect(commands.some((command) => command.kind === "fill-rect")).toBe(false);
  });

  it("paints one inset final-edge marker without inventing a background", () => {
    const commands: QuireDisplayCommand[] = [];
    const visual: QuireDecorationRectVisual = {
      id: "comment-range:final-line",
      decorationId: "comment-range",
      range: { from: 20, to: 28 },
      rect: { x: 10, y: 20, width: 60, height: 18 },
      attrs: {},
      endIndicator: {
        color: "rgba(37, 99, 235, 0.76)",
        width: 1.5,
        length: 8
      }
    };

    appendDecorationBackgroundCommands(
      commands,
      [visual],
      resolveDisplayListStyles(undefined)
    );

    expect(commands).toEqual([{
      id: "comment-range:final-line:end-indicator",
      kind: "line",
      layer: "overlay",
      range: { from: 20, to: 28 },
      from: { x: 69.25, y: 25 },
      to: { x: 69.25, y: 33 },
      strokeStyle: "rgba(37, 99, 235, 0.76)",
      lineWidth: 1.5
    }]);
  });
});
