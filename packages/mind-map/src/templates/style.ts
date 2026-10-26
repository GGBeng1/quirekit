import type { MindMapNodeStyle } from "../formatting/types";
import type { MindMapTemplateDesign } from "./types";

/** @param design - Persisted styling intent. @param depth - Root-relative depth. @param branch - Top-level palette lane. @returns Explicit v3 formatting. */
export function templateNodeStyle(design: MindMapTemplateDesign, depth: number, branch: number): MindMapNodeStyle {
  const { palette, shape, line, leaves } = design;
  const accent = palette.accents[branch % palette.accents.length]!;
  const tint = palette.tints[branch % palette.tints.length]!;
  const common = { lineStyle: line, lineColor: accent, lineWidth: 1.5, linePattern: "solid" as const };
  if (depth === 0) return { ...common, shape: design.rootShape ?? shape, fontSize: 20, bold: true,
    color: "#ffffff", fill: palette.root, borderColor: palette.root, borderWidth: 0 };
  if (depth === 1) return { ...common, shape, fontSize: 15, bold: true,
    color: accent, fill: tint, borderColor: accent, borderWidth: 1 };
  return { ...common, shape, fontSize: 13, bold: false, color: "#303b4b",
    fill: leaves === "filled" ? tint : "#ffffff", borderColor: leaves === "filled" ? accent : "#bbc4d0",
    borderWidth: leaves === "plain" ? 0 : 1 };
}
