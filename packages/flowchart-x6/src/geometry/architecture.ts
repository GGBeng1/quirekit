import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";

/** @param width - Local width. @param height - Local height. @param base - Common hit and caption geometry. @returns Original person symbol with separate closed head and open limbs. */
export function actorGeometry(width: number, height: number, base: ShapeGeometry): ShapeGeometry {
  const w = width, h = height, r = Math.min(w * 0.12, h * 0.11), cx = w / 2, cy = r;
  return { ...base, outline: `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`,
    detail: `M${cx} ${r * 2} V${h * 0.48} M${w * 0.2} ${h * 0.32} H${w * 0.8} M${cx} ${h * 0.48} L${w * 0.24} ${h * 0.68} M${cx} ${h * 0.48} L${w * 0.76} ${h * 0.68}`,
    hitPath: `M${cx} ${r * 2} V${h * 0.48} M${w * 0.2} ${h * 0.32} H${w * 0.8} M${w * 0.24} ${h * 0.68} L${cx} ${h * 0.48} L${w * 0.76} ${h * 0.68}`,
    textX: cx, textY: h * 0.86, textWidth: Math.max(8, w - 8), textHeight: Math.max(8, h * 0.24),
    ports: { top: { x: cx, y: 0 }, left: { x: w * 0.2, y: h * 0.32 }, right: { x: w * 0.8, y: h * 0.32 }, bottom: { x: w * 0.76, y: h * 0.68 } } };
}
/** @param node - Portable symbol dimensions. @param base - Default rectangle. @returns Architecture or annotation geometry without external image assets. */
export function architectureGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height">, base: ShapeGeometry): ShapeGeometry | undefined {
  const { shape, width: w, height: h } = node;
  if (shape === "actor") return actorGeometry(w, h, base);
  if (shape === "server") return { ...base, detail: `M0 ${h * 0.25} H${w} M${w * 0.12} ${h * 0.12} H${w * 0.22} M${w * 0.3} ${h * 0.12} H${w * 0.4} M${w * 0.7} ${h * 0.12} H${w * 0.88} M${w * 0.12} ${h * 0.82} H${w * 0.88} M${w * 0.12} ${h * 0.9} H${w * 0.88}`,
    textY: h * 0.51, textHeight: h * 0.42 };
  if (shape === "browser") return { ...base, detail: `M0 ${h * 0.24} H${w} M${w * 0.08} ${h * 0.12} H${w * 0.1} M${w * 0.16} ${h * 0.12} H${w * 0.18} M${w * 0.24} ${h * 0.12} H${w * 0.26} M${w * 0.4} ${h * 0.12} H${w * 0.9}`,
    textY: h * 0.62, textHeight: h * 0.6 };
  if (shape === "mobile") return { ...base, detail: `M${w * 0.35} ${h * 0.09} H${w * 0.65} M${w * 0.15} ${h * 0.18} H${w * 0.85} V${h * 0.8} H${w * 0.15} Z M${w * 0.4} ${h * 0.91} H${w * 0.6}`,
    textWidth: w * 0.65, textHeight: h * 0.48, textY: h * 0.49 };
  if (shape === "component") return { ...base,
    outline: `M${w * 0.16} 0 H${w} V${h} H${w * 0.16} V${h * 0.8} H0 V${h * 0.6} H${w * 0.16} V${h * 0.4} H0 V${h * 0.2} H${w * 0.16} Z`,
    detail: `M${w * 0.16} ${h * 0.2} H${w * 0.3} V${h * 0.4} H${w * 0.16} M${w * 0.16} ${h * 0.6} H${w * 0.3} V${h * 0.8} H${w * 0.16}`,
    textX: w * 0.63, textWidth: w * 0.62, ports: { ...base.ports, left: { x: w * 0.16, y: h / 2 } } };
  if (shape === "package") return { ...base, outline: `M0 0 H${w * 0.42} L${w * 0.52} ${h * 0.2} H${w} V${h} H0 Z`,
    detail: `M0 ${h * 0.2} H${w * 0.52}`, textY: h * 0.61, textHeight: h * 0.6, ports: { ...base.ports, top: { x: w / 2, y: h * 0.16 } } };
  if (shape === "queue") return { ...base, detail: `M${w * 0.13} 0 V${h} M${w * 0.26} 0 V${h} M${w * 0.74} 0 V${h} M${w * 0.87} 0 V${h}`,
    textWidth: w * 0.43 };
  if (["bracket-left", "bracket-right", "brace"].includes(shape)) {
    const detail = shape === "brace" ? `M${w * 0.7} 0 Q${w * 0.35} 0 ${w * 0.35} ${h * 0.25} Q${w * 0.35} ${h * 0.5} 0 ${h * 0.5} Q${w * 0.35} ${h * 0.5} ${w * 0.35} ${h * 0.75} Q${w * 0.35} ${h} ${w * 0.7} ${h}`
      : shape === "bracket-left" ? `M${w * 0.7} 0 H${w * 0.2} V${h} H${w * 0.7}` : `M${w * 0.3} 0 H${w * 0.8} V${h} H${w * 0.3}`;
    const x = shape === "bracket-right" ? w * 0.8 : shape === "brace" ? 0 : w * 0.2, tip = shape === "bracket-right" ? w * 0.3 : w * 0.7;
    return { ...base, visible: false, detail, textX: shape === "bracket-right" ? w * 0.35 : w * 0.65, textWidth: w * 0.4,
      ports: { top: { x: tip, y: 0 }, bottom: { x: tip, y: h }, left: { x, y: h / 2 }, right: { x, y: h / 2 } } };
  }
  return undefined;
}
