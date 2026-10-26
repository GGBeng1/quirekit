import type { FlowchartEdge, FlowchartMotionEffect, FlowchartTravelEffect } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import { motionPath, motionPoint, motionProgress } from "./geometry";
import { motionPayload } from "./payload";
import type { MotionActor } from "./types";
import type { createMotionVisibility } from "./visibility";
import { motionBeamPath, motionBeamSpan } from "./beam";
import { motionPulse } from "./pulse";
import { motionFlow } from "./flow";

/** @param runtime - Graph/theme owner. @param effect - Travel timing/content. @param layer - World-coordinate actor mount. @returns Staggered objects on a cached real path. */
function travel(runtime: FlowRuntime, effect: FlowchartTravelEffect, layer: SVGGElement): MotionActor | undefined {
  const points = motionPath(runtime, effect.id, layer); if (points.length < 2) return;
  const group = runtime.mount.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g");
  group.dataset.flowMotionTravel = effect.id;
  const cell = runtime.graph.getCellById(effect.id), color = cell?.getData<{ source: FlowchartEdge }>().source.style.stroke ?? runtime.appearance.line;
  const objects = Array.from({ length: effect.count ?? 1 }, () => motionPayload(runtime, effect, color)), span = motionBeamSpan(points);
  const trails = objects.map(object => object.querySelector("[data-flow-motion-beam]")); group.append(...objects);
  return { element: group, effect,
    /** @param progress - Logical step position. @param duration - Owning duration. @param reduced - Display the arrival without travel. */
    frame(progress, duration, reduced) {
      const t = reduced ? 1 : motionProgress(effect, progress, duration);
      objects.forEach((object, i) => {
        const p = Math.max(0, Math.min(1, objects.length > 1 ? t * 1.28 - i * .28 / (objects.length - 1) : t)), point = motionPoint(points, effect.direction === "reverse" ? 1 - p : p);
        object.setAttribute("transform", `translate(${point.x},${point.y})`);
        object.setAttribute("opacity", String(Math.min(1, p / .05, (1 - p) / .05)));
        trails[i]?.setAttribute("d", motionBeamPath(points, p, span, effect.direction === "reverse"));
      });
    },
  };
}
/** @param runtime - Source contour/theme owner. @param effect - Local cue. @param layer - World-coordinate mount. @param visibility - Reversible cell opacity. @param lines - Reversible connector paint opacity. @returns Retained frame port without graph reads during animation. */
export function motionActor(runtime: FlowRuntime, effect: FlowchartMotionEffect, layer: SVGGElement, visibility: ReturnType<typeof createMotionVisibility>, lines: ReturnType<typeof createMotionVisibility>): MotionActor | undefined {
  if (effect.kind === "flow") return motionFlow(runtime, effect, lines);
  if (effect.kind === "travel") return travel(runtime, effect, layer);
  if (effect.kind === "appear") return { effect,
    /** @param progress - Current step position. @param duration - Owning duration. @param reduced - Completed pose. */
    frame(progress, duration, reduced) { visibility.set(effect.id, reduced ? 1 : motionProgress(effect, progress, duration)); },
  };
  return motionPulse(runtime, effect);
}
