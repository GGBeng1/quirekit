import type { MindMapAppearance } from "../types";

/** @param appearance - Host semantic colors. @returns Vendor presentation config, separate from node data. */
export function projectMindMapAppearance(appearance: MindMapAppearance): Record<string, unknown> {
  const node = { fontFamily: appearance.fontFamily, color: appearance.text, fontSize: 14,
    fillColor: appearance.surface, borderColor: appearance.border, borderWidth: 1,
    borderRadius: 6, hoverRectColor: appearance.primary, hoverRectRadius: 7 };
  return {
    backgroundColor: "transparent", lineColor: appearance.primary, lineWidth: 1.5,
    lineStyle: "curve", paddingX: 16, paddingY: 9,
    root: { ...node, fillColor: appearance.primary, color: appearance.onPrimary,
      borderColor: appearance.primary, fontSize: 18, fontWeight: "bold", paddingX: 24, paddingY: 14 },
    second: { ...node, fillColor: appearance.soft, borderColor: appearance.primary, fontSize: 15, marginX: 64, marginY: 24 },
    node: { ...node, marginX: 36, marginY: 10 },
  };
}
