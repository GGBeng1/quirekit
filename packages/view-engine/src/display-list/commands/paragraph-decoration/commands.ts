import type { QuireDisplayCommand, QuireLineCommand } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import type { QuireDisplayListStyles } from "../../types";
import { paragraphBorderLine, paragraphBorderStroke, paragraphDecorationRect, paragraphShadingRect, visibleParagraphBorders } from "./geometry";
import type { ParagraphBorderRing } from "./types";

/** @param commands - Mutable display list. @param node - Paragraph fragment. */
export function appendParagraphShadingCommand(commands: QuireDisplayCommand[], node: QuireLayoutNode): void {
  const decoration = node.paragraphDecoration;
  if (decoration?.fillStyle === undefined) return;
  commands.push({ id: `${node.id}:paragraph-shading`, kind: "fill-rect", range: node.range,
    rect: paragraphShadingRect(paragraphDecorationRect(node), visibleParagraphBorders(decoration)),
    fillStyle: decoration.fillStyle });
}

/**
 * Compiles shared Canvas/SVG borders after text; vertical sides own overlapping corner colors.
 * @param commands - Mutable display list.
 * @param node - Paragraph fragment with physical decoration metadata.
 * @param styles - Automatic border-color source.
 */
export function appendParagraphBorderCommands(commands: QuireDisplayCommand[], node: QuireLayoutNode, styles: QuireDisplayListStyles): void {
  const decoration = node.paragraphDecoration;
  if (!decoration) return;
  const rect = paragraphDecorationRect(node);
  const borders = visibleParagraphBorders(decoration);
  for (const side of ["top", "bottom", "left", "right"] as const) {
    const border = borders[side];
    if (!border) continue;
    const rings: readonly (ParagraphBorderRing | undefined)[] = border.style === "double" ? ["outer", "inner"] : [undefined];
    for (const ring of rings) {
      const stroke = paragraphBorderStroke(border, ring);
      commands.push({ id: `${node.id}:paragraph-border:${side}${ring ? `:${ring}` : ""}`, kind: "line", range: node.range,
        ...paragraphBorderLine(side, borders, rect, ring),
        strokeStyle: border.strokeStyle ?? styles.textFillStyle, lineWidth: stroke.lineWidth,
        ...paragraphBorderDash(border.style, stroke.lineWidth) });
    }
  }
}

/** @param style - Canonical border token. @param width - Stroke width in CSS pixels. @returns Portable dash/cap metadata. */
function paragraphBorderDash(style: string, width: number): Pick<QuireLineCommand, "lineDash" | "lineCap"> {
  if (style === "dotted") return { lineDash: [width, width * 2], lineCap: "round" };
  if (style === "dashSmallGap" || style === "dashed") return { lineDash: [width * 4, width * 2] };
  if (style === "dotDash") return { lineDash: [width, width * 2, width * 4, width * 2] };
  if (style === "dotDotDash") return { lineDash: [width, width * 2, width, width * 2, width * 4, width * 2] };
  return {};
}
