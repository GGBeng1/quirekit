import type { FlowchartArrow } from "@quirekit/flowchart";

/** @param arrow - ER end symbol. @returns Original path pointing left at the attachment, or undefined for conventional markers. */
export function relationMarkerPath(arrow: FlowchartArrow): string | undefined {
  if (arrow === "triangle-hollow") return "M0 0 L12 -7 V7 Z";
  if (arrow === "diamond-hollow") return "M0 0 L8 -5 L16 0 L8 5 Z";
  const many = "M0 -6 L12 0 L0 6", one = "M3 -6 V6 M8 -6 V6";
  const zero = "M16 0 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0";
  if (arrow === "er-one") return one;
  if (arrow === "er-many") return many;
  if (arrow === "er-zero-one") return `M3 -6 V6 ${zero}`;
  if (arrow === "er-one-many") return `${many} M17 -6 V6`;
  if (arrow === "er-zero-many") return `${many} ${zero}`;
  return undefined;
}
