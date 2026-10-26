import type { FlowchartPulseEffect } from "@quirekit/flowchart";
import { readNode } from "../../codec/read";
import type { FlowRuntime } from "../../runtime/types";
import { motionProgress } from "./geometry";
import type { MotionActor } from "./types";

/** @param runtime - Source contour and theme owner. @param effect - Local filled or halo cue. @returns Cached contours with frame writes independent of the source view. */
export function motionPulse(runtime: FlowRuntime, effect: FlowchartPulseEffect): MotionActor | undefined {
  const cell = runtime.graph.getCellById(effect.id), view = cell && runtime.graph.findViewByCell(cell); if (!cell || !view) return;
  const document = runtime.mount.ownerDocument, ns = "http://www.w3.org/2000/svg", group = document.createElementNS(ns, "g"), shape = document.createElementNS(ns, "path");
  const original = view.findOne(cell.isNode() ? "body" : "line"), tone = effect.tone ? runtime.appearance.runColors?.[effect.tone] : original?.getAttribute("stroke");
  const color = tone && tone !== "none" ? tone : runtime.appearance.primary, halo = !!effect.halo && cell.isNode();
  let cx = 0, cy = 0;
  group.dataset.flowMotionPulse = effect.id;
  shape.setAttribute("fill", cell.isNode() && !halo ? color : "none"); shape.setAttribute("stroke", halo || cell.isEdge() ? color : "none");
  shape.setAttribute("stroke-width", halo ? "1.5" : "5"); shape.setAttribute("vector-effect", "non-scaling-stroke");
  if (cell.isNode()) {
    const node = readNode(cell); cx = node.width / 2; cy = node.height / 2;
    group.setAttribute("transform", `translate(${node.x},${node.y}) rotate(${node.rotation ?? 0},${cx},${cy})`);
    shape.setAttribute("d", original?.getAttribute("d") || `M0 0H${node.width}V${node.height}H0Z`);
    if (original?.hasAttribute("transform")) shape.setAttribute("transform", original.getAttribute("transform")!);
  } else shape.setAttribute("d", original?.getAttribute("d") ?? "");
  const rings = halo ? [0, 1].map(() => { const ring = document.createElementNS(ns, "g"); ring.dataset.flowMotionHalo = ""; ring.append(shape.cloneNode(true)); group.append(ring); return ring; }) : [];
  if (!halo) group.append(shape);
  return { element: group, effect,
    /** @param progress - Logical step position. @param duration - Owning duration. @param reduced - Suppress continuous emphasis. */
    frame(progress, duration, reduced) {
      const t = motionProgress(effect, progress, duration), envelope = reduced ? 0 : Math.sin(Math.PI * t) ** 2;
      if (!halo) { group.setAttribute("opacity", String(.2 * envelope * (.65 + .35 * Math.sin(t * Math.PI * 6) ** 2))); return; }
      rings.forEach((ring, i) => {
        const phase = (t * 3 + i * .5) % 1;
        ring.setAttribute("transform", `translate(${cx},${cy}) scale(${1 + phase * .9}) translate(${-cx},${-cy})`);
        ring.setAttribute("opacity", String(envelope * (1 - phase) * .7));
      });
    },
  };
}
