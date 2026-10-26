import type { FlowchartMotionEffect, FlowchartTravelEffect } from "@quirekit/flowchart";
import type { PlaybackEffectDraft } from "./types";

/** @param draft - Explicit captured authoring intent. @returns Applicable effects without guessing algorithm events or changing source objects. */
export function stepEffects(draft: PlaybackEffectDraft): readonly FlowchartMotionEffect[] | undefined {
  if (draft.animation === "existing") return draft.existing;
  if (draft.animation === "none") return;
  const flow = draft.animation.startsWith("flow-"), travel = ["dot", "beam", "token", "vector"].includes(draft.animation), edges = new Set(draft.edges);
  const targets = draft.targets.filter(id => flow || travel ? edges.has(id) : draft.animation === "halo" ? !edges.has(id) : true);
  if (!targets.length) throw new Error(flow || travel ? "沿线动效请选择连线" : "请选择适用的图形");
  if (targets.length > 64) throw new Error("每步最多设置 64 个动效目标");
  return targets.map(id => {
    const timing = { id, delay: draft.delay };
    if (flow) return { ...timing, kind: "flow", style: draft.animation.slice(5) as "dash" | "beam" | "dot", speed: draft.speed, direction: draft.direction };
    if (travel) return { ...timing, kind: "travel", payload: draft.animation as NonNullable<FlowchartTravelEffect["payload"]>, direction: draft.direction,
      ...(["token", "vector"].includes(draft.animation) ? { label: Array.from(draft.title.replace(/\s+/gu, " ")).slice(0, 16).join("") } : {}) };
    if (draft.animation === "halo") return { ...timing, kind: "pulse", halo: true };
    return { ...timing, kind: draft.animation as "pulse" | "appear" };
  });
}
