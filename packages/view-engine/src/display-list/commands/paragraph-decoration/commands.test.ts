import type { QuireDisplayCommand } from "@quirekit/renderer";
import { describe, expect, it } from "vitest";
import type { QuireLayoutNode } from "../../../layout";
import { resolveDisplayListStyles } from "../../styles";
import {
  appendParagraphBorderCommands,
  appendParagraphShadingCommand
} from "./index";

const styles = resolveDisplayListStyles({ textFillStyle: "#0F172A" });

describe("paragraph decoration display commands", () => {
  it("paints shading before page-fragment border sides", () => {
    const commands: QuireDisplayCommand[] = [];
    const node = createNode();
    appendParagraphShadingCommand(commands, node);
    commands.push({
      id: "paragraph:text-sentinel",
      kind: "text",
      range: { from: 1, to: 8 },
      rect: { x: 20, y: 30, width: 32, height: 16 },
      origin: { x: 20, y: 40 },
      text: "Text",
      fillStyle: "#0F172A",
      font: "16px sans-serif"
    });
    appendParagraphBorderCommands(commands, node, styles);

    expect(commands).toEqual([
      {
        id: "paragraph:paragraph-shading",
        kind: "fill-rect",
        range: { from: 1, to: 8 },
        rect: { x: 19.5, y: 28, width: 140.5, height: 42 },
        fillStyle: "#F0F4FA"
      },
      expect.objectContaining({
        id: "paragraph:text-sentinel",
        kind: "text"
      }),
      expect.objectContaining({
        id: "paragraph:paragraph-border:top",
        kind: "line",
        from: { x: 18.5, y: 27 },
        to: { x: 160, y: 27 },
        strokeStyle: "#2563EB",
        lineWidth: 2
      }),
      expect.objectContaining({
        id: "paragraph:paragraph-border:left",
        kind: "line",
        from: { x: 19, y: 26 },
        to: { x: 19, y: 70 },
        strokeStyle: "#0F172A",
        lineDash: [1, 2],
        lineCap: "round"
      })
    ]);
  });

  it("omits block-end borders on a continued page fragment", () => {
    const commands: QuireDisplayCommand[] = [];
    const node = createNode();
    const continuedNode = {
      ...node,
      paragraphDecoration: {
        ...node.paragraphDecoration!,
        firstFragment: false,
        lastFragment: false
      }
    };
    appendParagraphShadingCommand(commands, continuedNode);
    appendParagraphBorderCommands(commands, continuedNode, styles);

    expect(commands.map((command) => command.id)).toEqual([
      "paragraph:paragraph-shading",
      "paragraph:paragraph-border:left"
    ]);
  });

  it("anchors the bottom border to intrinsic content instead of extended flow height", () => {
    const commands: QuireDisplayCommand[] = [];
    const node = createNode();
    appendParagraphBorderCommands(commands, {
      ...node,
      paragraphDecoration: {
        ...node.paragraphDecoration!,
        firstFragment: false,
        lastFragment: true
      }
    }, styles);

    expect(commands).toContainEqual(expect.objectContaining({
      id: "paragraph:paragraph-border:bottom",
      from: { x: 18.5, y: 73 },
      to: { x: 160, y: 73 }
    }));
  });

  it("insets decoration without shrinking the full inline wrapping rectangle", () => {
    const commands: QuireDisplayCommand[] = [];
    const node = createNode();
    const insetNode: QuireLayoutNode = {
      ...node,
      paragraphDecoration: {
        ...node.paragraphDecoration!,
        top: undefined,
        left: undefined,
        inlineOffset: 16,
        inlineSize: 88
      }
    };

    appendParagraphShadingCommand(commands, insetNode);

    expect(insetNode.inlineLayoutRect).toEqual({
      x: 20,
      y: 30,
      width: 140,
      height: 40
    });
    expect(commands).toEqual([expect.objectContaining({
      kind: "fill-rect",
      rect: { x: 36, y: 30, width: 88, height: 40 }
    })]);
  });

  it("fills border spacing without changing text layout and excludes hidden page edges", () => {
    const node = createNode();
    const edge = { style: "single", lineWidth: 2, space: 6 };
    const decoration = { top: edge, bottom: edge, left: edge, right: edge, fillStyle: "#AABBCC", firstFragment: true, lastFragment: true };
    const boxed: QuireLayoutNode = { ...node, paragraphDecoration: decoration };
    const commands: QuireDisplayCommand[] = [];
    appendParagraphShadingCommand(commands, boxed);
    expect(commands[0]).toMatchObject({ rect: { x: 14, y: 24, width: 152, height: 52 } });
    expect(boxed.inlineLayoutRect).toBe(node.inlineLayoutRect);
    const continued: QuireDisplayCommand[] = [];
    appendParagraphShadingCommand(continued, { ...boxed, paragraphDecoration: { ...decoration, firstFragment: false, lastFragment: false } });
    expect(continued[0]).toMatchObject({ rect: { x: 14, y: 30, width: 152, height: 40 } });
  });
});

/**
 * Creates a paragraph layout-node fixture with physical decoration metadata.
 *
 * @returns Paragraph layout node used by display-list assertions.
 */
function createNode(): QuireLayoutNode {
  return {
    id: "paragraph",
    kind: "inline",
    range: { from: 1, to: 8 },
    rect: { x: 10, y: 30, width: 80, height: 64 },
    inlineLayoutRect: { x: 20, y: 30, width: 140, height: 40 },
    paragraphDecoration: {
      fillStyle: "#F0F4FA",
      top: {
        style: "single",
        strokeStyle: "#2563EB",
        lineWidth: 2,
        space: 2
      },
      bottom: {
        style: "single",
        strokeStyle: "#2563EB",
        lineWidth: 2,
        space: 2
      },
      left: {
        style: "dotted",
        lineWidth: 1,
        space: 0.5
      },
      firstFragment: true,
      lastFragment: false
    }
  };
}
