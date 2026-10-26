import type { FlowchartTravelEffect } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";

/** @param runtime - Theme and DOM owner. @param effect - Plain content-bearing payload. @param color - Cached connector color. @returns Original SVG token/vector illustration, independent of a source shape. */
export function motionPayload(runtime: FlowRuntime, effect: FlowchartTravelEffect, color: string): SVGGElement {
  const document = runtime.mount.ownerDocument, ns = "http://www.w3.org/2000/svg", group = document.createElementNS(ns, "g");
  const tone = effect.tone ? runtime.appearance.runColors?.[effect.tone] ?? color : color;
  const width = effect.payload === "vector" ? 76 : Math.max(36, Math.min(150, (effect.label?.length ?? 1) * 9 + 24)), height = effect.payload === "vector" ? 36 : 28;
  group.dataset.flowMotionPayload = effect.payload ?? "dot";
  if (effect.payload === "beam") {
    const trail = document.createElementNS(ns, "path"); trail.dataset.flowMotionBeam = "";
    for (const [name, value] of Object.entries({ fill: "none", stroke: tone, "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" })) trail.setAttribute(name, value);
    group.append(trail); return group;
  }
  if (!effect.payload || effect.payload === "dot") {
    const halo = document.createElementNS(ns, "circle"), dot = document.createElementNS(ns, "circle");
    halo.setAttribute("r", "6"); halo.setAttribute("fill", tone); halo.setAttribute("opacity", ".1"); dot.setAttribute("r", "2.5"); dot.setAttribute("fill", tone); group.append(halo, dot); return group;
  }
  const rect = document.createElementNS(ns, "rect");
  for (const [name, value] of Object.entries({ x: String(-width / 2), y: String(-height / 2), width: String(width), height: String(height), rx: "5", fill: runtime.appearance.surface, stroke: tone, "stroke-width": "1" })) rect.setAttribute(name, value);
  group.append(rect);
  if (effect.payload === "vector") {
    const values = effect.values ?? [.3, -.5, .8, -.2, .65, -.7, .45, .9];
    values.forEach((value, i) => {
      const bar = document.createElementNS(ns, "rect"), gap = 58 / values.length;
      for (const [name, attr] of Object.entries({ x: String(-29 + gap * i), y: String(value > 0 ? -10 * value : 0), width: String(Math.max(1, gap - 2)), height: String(Math.max(1, Math.abs(value) * 10)), rx: "1", fill: tone, opacity: String(.35 + Math.abs(value) * .6) })) bar.setAttribute(name, attr);
      group.append(bar);
    });
  }
  if (effect.label) {
    const text = document.createElementNS(ns, "text"); text.textContent = effect.label;
    for (const [name, value] of Object.entries({ "text-anchor": "middle", "dominant-baseline": "central", "font-size": effect.payload === "vector" ? "9" : "12", "font-family": runtime.appearance.fontFamily, fill: tone, y: effect.payload === "vector" ? "12" : "0", "font-weight": "600" })) text.setAttribute(name, value);
    group.append(text);
  }
  return group;
}
