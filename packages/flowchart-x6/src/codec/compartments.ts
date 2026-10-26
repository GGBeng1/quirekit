import { classAttrs } from "./classes";
import type { CellAttrs } from "@antv/x6";
import type { FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartAppearance } from "../types";

/** @param node - Valid entity. @param appearance - Theme. @returns Bounded, single-line field cells; clipped rows remain intact in source. */
export function compartmentAttrs(node: FlowchartNode, appearance: FlowchartAppearance): CellAttrs {
  if (node.uml) return classAttrs(node, appearance);
  if (!node.entity) return {};
  const attrs: CellAttrs = {}, fontSize = node.style.fontSize ?? 14, line = fontSize * 1.5;
  const top = Math.min(40, node.height / 3), inset = Math.min(8 + (node.style.padding ?? 0), node.width / 8);
  const width = node.width - inset * 2, available = Math.max(0, Math.floor((node.height - top - 12) / line));
  const truncated = node.entity.fields.length > available, count = Math.max(0, Math.min(node.entity.fields.length, available - (truncated ? 1 : 0)));
  /** @param selector - Stable cell slot. @param text - Literal row content. @param x - Local x. @param y - Local center. @param w - Column width. @param right - Right alignment. */
  function cell(selector: string, text: string, x: number, y: number, w: number, right = false): void {
    attrs[selector] = { text, fill: node.style.color ?? appearance.text, fontSize, fontFamily: appearance.fontFamily,
      refX: 0, refY: 0, x, y, textAnchor: right ? "end" : "start", textVerticalAnchor: "middle", pointerEvents: "none",
      textWrap: { width: Math.max(1, w) - node.width, height: fontSize * 1.25 - node.height, ellipsis: true, breakWord: false } };
  }
  const keyLabels = { none: "", primary: "PK", foreign: "FK", "primary-foreign": "PK/FK" };
  for (let i = 0; i < count; i++) {
    const row = node.entity.fields[i]!, y = top + 6 + (i + 0.5) * line;
    cell(`memberKey${i}`, keyLabels[row.key], inset, y, width * 0.2);
    cell(`memberName${i}`, row.name, inset + width * 0.23, y, width * 0.43);
    cell(`memberType${i}`, row.type, node.width - inset, y, width * 0.3, true);
  }
  if (truncated && available > 0) cell("memberOverflow", `… +${node.entity.fields.length - count}`, inset, top + 6 + (count + 0.5) * line, width);
  return attrs;
}
