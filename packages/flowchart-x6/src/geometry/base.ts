import type { FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";

/** @param width - Local width. @param height - Local height. @param radius - Corner radius. @returns Closed rounded outline. */
function rounded(width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2), w = width, h = height;
  return `M${r} 0 H${w - r} Q${w} 0 ${w} ${r} V${h - r} Q${w} ${h} ${w - r} ${h} H${r} Q0 ${h} 0 ${h - r} V${r} Q0 0 ${r} 0 Z`;
}
/** @param node - Source size and shape. @returns Local paths, safe text area and on-contour attachments. */
export function baseGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height">): ShapeGeometry {
  const { width: w, height: h, shape } = node;
  let outline = rounded(w, h, shape === "terminator" ? h / 2 : shape === "process" ? 6 : 0), detail = "";
  let textWidth = w - 24, textHeight = h - 12, textY = h / 2;
  const ports = { top: { x: w / 2, y: 0 }, right: { x: w, y: h / 2 }, bottom: { x: w / 2, y: h }, left: { x: 0, y: h / 2 } };
  // Caption and attachment coordinates belong to the precise local contour.
  // Decorative strokes may wander without moving these semantic anchors.
  /** @param points - Normalized polygon vertices. @returns Closed local outline. */
  const polygon = (points: readonly (readonly [number, number])[]): string => points.map(([x, y], i) => `${i ? "L" : "M"}${x * w} ${y * h}`).join(" ") + " Z";
  if (shape === "ellipse" || shape === "circle") {
    const rx = shape === "circle" ? Math.min(w, h) / 2 : w / 2, ry = shape === "circle" ? rx : h / 2;
    outline = `M${w / 2 - rx} ${h / 2} A${rx} ${ry} 0 1 0 ${w / 2 + rx} ${h / 2} A${rx} ${ry} 0 1 0 ${w / 2 - rx} ${h / 2} Z`;
    Object.assign(ports, { top: { x: w / 2, y: h / 2 - ry }, bottom: { x: w / 2, y: h / 2 + ry }, left: { x: w / 2 - rx, y: h / 2 }, right: { x: w / 2 + rx, y: h / 2 } });
    textWidth = rx * 1.4; textHeight = ry * 1.25;
  } else if (shape === "decision") {
    outline = polygon([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]]); textWidth = w * 0.58; textHeight = h * 0.55;
  } else if (shape === "data") {
    outline = polygon([[0.2, 0], [1, 0], [0.8, 1], [0, 1]]); textWidth = w * 0.6;
    ports.left.x = w * 0.1; ports.right.x = w * 0.9;
  } else if (shape === "document") {
    outline = `M0 0 H${w} V${h * 0.85} C${w * 0.65} ${h * 0.4} ${w * 0.35} ${h * 1.3} 0 ${h * 0.85} Z`;
    ports.bottom.y = h * 0.85; textY = h * 0.4; textHeight = h * 0.6;
  } else if (shape === "triangle") {
    outline = polygon([[0.5, 0], [1, 1], [0, 1]]); textWidth = w * 0.48; textHeight = h * 0.3; textY = h * 0.67;
    ports.left.x = w * 0.25; ports.right.x = w * 0.75;
  } else if (shape === "hexagon") {
    outline = polygon([[0.2, 0], [0.8, 0], [1, 0.5], [0.8, 1], [0.2, 1], [0, 0.5]]); textWidth = w * 0.6;
  } else if (shape === "note") {
    const f = Math.min(20, w * 0.2, h * 0.3);
    outline = `M0 0 H${w - f} L${w} ${f} V${h} H0 Z`; detail = `M${w - f} 0 V${f} H${w}`;
    textWidth = w - 28; textHeight = h - f - 8; textY = (h + f) / 2;
  } else if (shape === "subprocess") {
    detail = `M${w * 0.1} 0 V${h} M${w * 0.9} 0 V${h}`; textWidth = w * 0.7;
  } else if (shape === "database") {
    const r = h * 0.15;
    outline = `M0 ${r} A${w / 2} ${r} 0 0 1 ${w} ${r} V${h - r} A${w / 2} ${r} 0 0 1 0 ${h - r} Z`;
    detail = `M0 ${r} A${w / 2} ${r} 0 0 0 ${w} ${r}`; textY = h * 0.57; textHeight = h * 0.5;
  } else if (shape === "manual-input") {
    outline = polygon([[0, 0.25], [1, 0], [1, 1], [0, 1]]); ports.top.y = h * 0.125; textY = h * 0.58; textHeight = h * 0.55;
  } else if (shape === "delay" || shape === "display") {
    const inset = shape === "display" ? w * 0.2 : 0;
    outline = `M${inset} 0 H${w * 0.6} A${w * 0.4} ${h / 2} 0 0 1 ${w * 0.6} ${h} H${inset} L0 ${h / 2} Z`;
    textWidth = w * 0.58;
  } else if (shape === "off-page") {
    outline = polygon([[0, 0], [1, 0], [1, 0.65], [0.5, 1], [0, 0.65]]); textY = h * 0.4; textHeight = h * 0.5;
  } else if (shape === "cloud") {
    outline = `M0 ${h / 2} C0 ${h * 0.3} ${w * 0.1} ${h * 0.2} ${w * 0.25} ${h * 0.25} C${w * 0.25} ${h * 0.08} ${w * 0.35} 0 ${w / 2} 0 C${w * 0.65} 0 ${w * 0.76} ${h * 0.08} ${w * 0.76} ${h * 0.24} C${w * 0.92} ${h * 0.2} ${w} ${h * 0.34} ${w} ${h / 2} C${w} ${h * 0.64} ${w * 0.93} ${h * 0.76} ${w * 0.8} ${h * 0.76} C${w * 0.82} ${h * 0.92} ${w * 0.65} ${h} ${w / 2} ${h} C${w * 0.35} ${h} ${w * 0.22} ${h * 0.95} ${w * 0.2} ${h * 0.8} C${w * 0.06} ${h * 0.8} 0 ${h * 0.64} 0 ${h / 2} Z`;
    textWidth = w * 0.62; textHeight = h * 0.4; textY = h * 0.53;
  }
  return { outline, detail, ports, textX: w / 2, visible: true, textWidth: Math.max(8, textWidth), textHeight: Math.max(8, textHeight), textY };
}
