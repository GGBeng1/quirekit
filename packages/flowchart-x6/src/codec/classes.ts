import type { CellAttrs } from "@antv/x6";
import type { FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartAppearance } from "../types";
import { classDivider } from "../geometry/modeling";

/** @param node - Valid class source. @param appearance - Shared theme. @returns Literal, clipped attribute and operation rows in their owned compartments. */
export function classAttrs(node: FlowchartNode, appearance: FlowchartAppearance): CellAttrs {
  if (!node.uml) return {};
  const attrs: CellAttrs = {}, fontSize = node.style.fontSize ?? 14, line = fontSize * 1.5;
  const header = Math.min(40, node.height / 3), divider = classDivider(node);
  const inset = Math.min(8 + (node.style.padding ?? 0), node.width / 8);
  /** @param key - Stable section. @param rows - Source rows. @param top - Local top. @param bottom - Local bottom. */
  function section(key: string, rows: readonly string[], top: number, bottom: number): void {
    const available = Math.max(0, Math.floor((bottom - top - 12) / line + 1e-9)), truncated = rows.length > available;
    const visible = rows.slice(0, Math.max(0, available - (truncated ? 1 : 0)));
    if (truncated && available > 0) visible.push(`… +${rows.length - visible.length}`);
    visible.forEach((text, index) => {
      attrs[`${key}${index}`] = { text, fill: node.style.color ?? appearance.text, fontSize, fontFamily: appearance.fontFamily,
        refX: 0, refY: 0, x: inset, y: top + 6 + (index + 0.5) * line, textAnchor: "start", textVerticalAnchor: "middle", pointerEvents: "none",
        textWrap: { width: -inset * 2, height: fontSize * 1.25 - node.height, ellipsis: true, breakWord: false } };
    });
  }
  section("attribute", node.uml.attributes, header, divider); section("operation", node.uml.operations, divider, node.height);
  return attrs;
}
