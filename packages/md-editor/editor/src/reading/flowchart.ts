import type { VNodeChild } from "vue";
import { parseFlowchartEmbed } from "@quirekit/flowchart";
import { diagramFigure } from "./diagram-figure";

/** @param source - Confirmed fence body. @returns Inert saved preview, or undefined so invalid source stays readable. */
export function renderFlowchartPreview(source: string): VNodeChild | undefined {
  try {
    const board = parseFlowchartEmbed(source);
    return diagramFigure("data-qk-flowchart", board.title, board.preview);
  } catch { return undefined; }
}
