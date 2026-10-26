import type { CaptionMarkup } from "./types";
import type { FlowchartNode } from "@quirekit/flowchart";
import { captionLayout } from "../geometry/caption";
import type { FlowchartAppearance } from "../types";
import { captionMeasure } from "./measure";
import { layoutCaption } from "./layout";
import { v4 as uuidv4 } from "uuid";

/** @param node - Visible ordinary caption with explicit spans. @param appearance - Font/color defaults. @param document - Native graph owner. @returns Explicit SVG runs, with links inert in the editing canvas. */
export function richCaptionMarkup(node: FlowchartNode, appearance: FlowchartAppearance, document: Document): CaptionMarkup {
  const runs = layoutCaption(node, appearance, captionMeasure(document, appearance.fontFamily)), box = captionLayout(node);
  const id = `qk-caption-${uuidv4()}`;
  const children: CaptionMarkup[] = runs.map(run => {
    const span: CaptionMarkup = { tagName: "tspan", textContent: run.text, attrs: { x: run.x, y: run.y, "font-size": run.format.fontSize, "font-weight": run.format.bold ? 600 : 400,
      "font-style": run.format.italic ? "italic" : "normal", "text-decoration": [run.format.underline ? "underline" : "", run.format.strike ? "line-through" : ""].filter(Boolean).join(" ") || "none", fill: run.format.color } };
    return run.format.link ? { tagName: "a", attrs: { href: run.format.link, target: "_blank", rel: "noopener noreferrer", "pointer-events": "none" }, children: [span] } : span;
  });
  return { tagName: "g", selector: "richLabel", attrs: { "aria-label": node.text, "pointer-events": "none" }, children: [
    { tagName: "defs", children: [{ tagName: "clipPath", attrs: { id }, children: [{ tagName: "rect", attrs: { x: box.left, y: box.top, width: box.width, height: box.height } }] }] },
    { tagName: "text", attrs: { "font-family": appearance.fontFamily, "text-anchor": "start", "xml:space": "preserve", "clip-path": `url(#${id})` }, children },
  ] };
}
