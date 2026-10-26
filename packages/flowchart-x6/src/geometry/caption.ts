import type { FlowchartNode } from "@quirekit/flowchart";
import { shapeGeometry } from "./shapes";
import type { CaptionLayout } from "./types";

/** @param node - Shape-local safe area and explicit typography. @returns Positive inset dimensions and exact SVG anchors. */
export function captionLayout(node: FlowchartNode): CaptionLayout {
  const g = shapeGeometry(node), padding = node.style.padding ?? 0;
  const px = Math.min(padding, Math.max(0, (g.textWidth - 1) / 2)), py = Math.min(padding, Math.max(0, (g.textHeight - 1) / 2));
  const left = (node.flipX ? node.width - g.textX : g.textX) - g.textWidth / 2 + px, top = (node.flipY ? node.height - g.textY : g.textY) - g.textHeight / 2 + py;
  const width = g.textWidth - 2 * px, height = g.textHeight - 2 * py;
  const horizontal = node.style.textAlign ?? "center", verticalAnchor = node.style.verticalAlign ?? "middle";
  return { left, top, width, height, x: left + (horizontal === "left" ? 0 : horizontal === "right" ? width : width / 2),
    y: top + (verticalAnchor === "top" ? 0 : verticalAnchor === "bottom" ? height : height / 2),
    anchor: horizontal === "left" ? "start" : horizontal === "right" ? "end" : "middle", verticalAnchor };
}
