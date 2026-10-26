import { isSequenceParticipant, isSequenceFragment, sequenceHeaderHeight, type FlowchartNode } from "@quirekit/flowchart";
import type { ShapeGeometry } from "./types";
import { actorGeometry } from "./architecture";

/** @param start - Line origin. @param end - Line limit. @param fixed - Other axis coordinate. @param vertical - Whether dashes run downwards. @returns Finite independent dash subpaths without relying on a shared stroke style. */
function dashes(start: number, end: number, fixed: number, vertical = true): string {
  const parts: string[] = [];
  for (let p = start; p < end; p += 12) parts.push(vertical ? `M${fixed} ${p} V${Math.min(p + 6, end)}` : `M${p} ${fixed} H${Math.min(p + 6, end)}`);
  return parts.join(" ");
}
/** @param node - Portable structure dimensions. @param base - Ordinary rectangle geometry. @returns Header/line geometry or no structural override. */
export function structureGeometry(node: Pick<FlowchartNode, "shape" | "width" | "height">, base: ShapeGeometry): ShapeGeometry | undefined {
  const { shape, width: w, height: h } = node;
  if (shape === "group") return { ...base, visible: false, hitPath: base.outline };
  if (shape === "container" || shape === "lane-vertical") {
    const header = Math.min(48, h / 3);
    return { ...base, detail: `M0 ${header} H${w}`, textY: header / 2, textHeight: Math.max(8, header - 12) };
  }
  if (shape === "lane-horizontal") {
    const header = Math.min(104, w / 4);
    return { ...base, detail: `M${header} 0 V${h}`, textX: header / 2, textWidth: Math.max(8, header - 16) };
  }
  if (isSequenceParticipant(shape)) {
    const header = sequenceHeaderHeight(node), actor = shape === "actor-lifeline", person = actorGeometry(w, header, base);
    const timeline = `M${w / 2} ${header} V${h}`;
    return { ...(actor ? person : base), outline: actor ? person.outline : `M0 0 H${w} V${header} H0 Z`,
      detail: `${actor ? person.detail : ""} ${dashes(header + 6, h, w / 2)}`, hitPath: `${actor ? person.hitPath : ""} ${timeline}`,
      textY: actor ? person.textY : header / 2, textHeight: actor ? person.textHeight : Math.max(8, header - 12),
      ports: { ...(actor ? person.ports : base.ports), right: actor ? person.ports.right : { x: w, y: header / 2 },
        left: actor ? person.ports.left : { x: 0, y: header / 2 }, bottom: { x: w / 2, y: h } } };
  }
  if (isSequenceFragment(shape)) {
    const header = Math.min(32, h / 4), tab = Math.min(90, w * 0.35);
    return { ...base, detail: `M0 ${header} H${tab * 0.8} L${tab} ${header * 0.5} V0 ${shape === "sequence-alt" ? dashes(0, w, h / 2, false) : ""}`,
      textX: tab * 0.4, textY: header / 2, textWidth: Math.max(8, tab * 0.7), textHeight: Math.max(8, header - 8) };
  }
  if (shape === "destruction") return { ...base, visible: false, detail: `M0 0 L${w} ${h} M${w} 0 L0 ${h}`,
    ports: { top: { x: w / 2, y: h / 2 }, bottom: { x: w / 2, y: h / 2 }, left: { x: w / 2, y: h / 2 }, right: { x: w / 2, y: h / 2 } } };
  if (shape === "phase-vertical") {
    const header = Math.min(32, h / 3);
    return { ...base, visible: false, outline: `M0 0 H${w} V${header} H0 Z`, detail: dashes(header, h, w / 2), hitPath: `M${w / 2} ${header} V${h}`,
      textY: header / 2, textHeight: Math.max(8, header - 8), ports: { ...base.ports, left: { x: w / 2, y: h / 2 }, right: { x: w / 2, y: h / 2 } } };
  }
  if (shape === "phase-horizontal") {
    const header = Math.min(100, w / 3);
    return { ...base, visible: false, outline: `M0 0 H${header} V${h} H0 Z`, detail: dashes(header, w, h / 2, false), hitPath: `M${header} ${h / 2} H${w}`,
      textX: header / 2, textWidth: Math.max(8, header - 12), ports: { ...base.ports, top: { x: w / 2, y: h / 2 }, bottom: { x: w / 2, y: h / 2 } } };
  }
  return shape === "activation" ? { ...base, textWidth: Math.max(8, w - 4) } : undefined;
}
