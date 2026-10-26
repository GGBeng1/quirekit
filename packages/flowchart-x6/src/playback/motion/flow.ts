import type { EdgeView } from "@antv/x6";
import type { FlowchartEdge, FlowchartFlowEffect } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import { motionProgress } from "./geometry";
import type { MotionActor } from "./types";
import type { createMotionVisibility } from "./visibility";

/** @param runtime - Native route/theme owner. @param effect - Portable continuous-flow intent. @param lines - Retained base-line visibility. @returns One exact path with logical-time dash movement, independent of connector length. */
export function motionFlow(runtime: FlowRuntime, effect: FlowchartFlowEffect, lines: ReturnType<typeof createMotionVisibility>): MotionActor | undefined {
  const cell = runtime.graph.getCellById(effect.id), view = cell && runtime.graph.findViewByCell(cell);
  if (!cell?.isEdge() || !view) return;
  // Compile the native world path once. SVG owns arc-length distribution; the
  // player owns time, so pause/seek/rate cannot diverge from a CSS animation.
  const source = cell.getData<{ source: FlowchartEdge }>().source, path = runtime.mount.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
  const color = source.style.stroke ?? runtime.appearance.line, tone = effect.tone ? runtime.appearance.runColors?.[effect.tone] ?? color : color;
  const width = effect.style === "dot" ? 2.8 : Math.max(1.4, Math.min(2.25, source.style.width ?? 1.5));
  path.dataset.flowMotionFlow = effect.id; path.dataset.flowStyle = effect.style ?? "dash";
  for (const [name, value] of Object.entries({ d: (view as EdgeView).getConnectionPathData(), fill: "none", stroke: tone, "stroke-width": String(width),
    "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": effect.style === "beam" ? "14 58" : effect.style === "dot" ? ".01 18" : "5 9" })) path.setAttribute(name, value);
  lines.set(effect.id, 1); let visible: boolean | undefined;
  return { element: path, effect,
    /** @param progress - Logical step position. @param duration - Owning step duration. @param reduced - Restore the base line without flow. */
    frame(progress, duration, reduced) {
      const elapsed = progress * duration - (effect.delay ?? 0), length = effect.duration ?? duration - (effect.delay ?? 0);
      const active = !reduced && elapsed >= 0 && elapsed < length;
      if (visible !== active) { lines.set(effect.id, active ? .24 : 1); path.setAttribute("opacity", active ? ".9" : "0"); visible = active; }
      const offset = motionProgress(effect, progress, duration) * length / 1000 * (effect.speed ?? 48);
      path.setAttribute("stroke-dashoffset", String((effect.direction === "reverse" ? 1 : -1) * offset));
    },
  };
}
