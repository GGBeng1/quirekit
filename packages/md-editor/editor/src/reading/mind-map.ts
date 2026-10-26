import type { VNodeChild } from "vue";
import { parseMindMapEmbed } from "@quirekit/mind-map";
import { diagramFigure } from "./diagram-figure";

/** @param source - Confirmed fence body. @returns Inert saved preview, or undefined so invalid source stays readable. */
export function renderMindMapPreview(source: string): VNodeChild | undefined {
  try {
    const board = parseMindMapEmbed(source);
    return diagramFigure("data-qk-mind-map", board.title, board.preview);
  } catch { return undefined; }
}
