import type { FlowchartImageOptions } from "../export/types";
import { rasterizeFlowchartSnapshot } from "../export/raster";
import { serializeFlowchart, type FlowchartSnapshot } from "@quirekit/flowchart";
import { readGraph } from "../codec/read";
import { requireIdle } from "./commands";
import type { FlowRuntime, FlowTextInput } from "./types";
import { exportContentBounds } from "../export/bounds";
import { restoreMotionOpacity } from "../playback/motion/visibility";

/** @param runtime - Current graph. @param text - Pending input. @returns Frozen content SVG snapshot. */
export async function exportFlowSvg(runtime: FlowRuntime, text: FlowTextInput): Promise<FlowchartSnapshot> {
  requireIdle(runtime, text);
  runtime.exporting = true;
  try {
    const document = readGraph(runtime.graph, runtime.options.document.revision);
    const source = serializeFlowchart(document);
    runtime.refreshCrossings();
    const bbox = exportContentBounds(runtime.graph).inflate(16);
    const width = Math.max(32, bbox.width), height = Math.max(32, bbox.height);
    const svg = await runtime.graph.toSVGAsync({ copyStyles: false, serializeImages: false,
      preserveDimensions: { width, height }, viewBox: { x: bbox.x, y: bbox.y, width, height },
      /** @param element - Detached export SVG. */
      beforeSerialize(element) {
        // X6 3.1.8 stores pan/zoom on a viewport wrapper while its exporter only
        // clears the stage. The detached asset must use world coordinates throughout.
        element.querySelector(".x6-graph-svg-viewport")?.removeAttribute("transform");
        restoreMotionOpacity(element);
        element.querySelectorAll(".x6-port, .x6-cell-tools, .x6-edge-tools, .qk-flow-hit, [data-flow-run-layer]").forEach(node => node.remove());
        // Selection and restored transform handles mark live cells. Their CSS
        // identities are interaction chrome, just like the removed tool nodes.
        element.querySelectorAll(".x6-cell").forEach(node => node.classList.remove("has-widget-transform", "x6-node-selected", "x6-edge-selected"));
        element.querySelectorAll("a").forEach(node => node.setAttribute("pointer-events", "visiblePainted"));
      },
    });
    if (runtime.destroyed) throw new Error("流程图导出已取消");
    return Object.freeze({ svg, width, height, source, revision: document.revision });
  } finally { runtime.exporting = false; }
}
/** @param runtime - Current instance. @param text - Native input. @param options - Explicit PNG appearance. @returns PNG from the same frozen SVG, lowered to the supported pixel budget when needed. */
export async function exportFlowPng(runtime: FlowRuntime, text: FlowTextInput, options: FlowchartImageOptions = {}): Promise<string> {
  const snapshot = await exportFlowSvg(runtime, text);
  runtime.exporting = true;
  try {
    const data = await rasterizeFlowchartSnapshot(snapshot, options, runtime.mount.ownerDocument, runtime.options.signal);
    if (runtime.destroyed) throw new Error("流程图导出已取消");
    return data;
  } finally { runtime.exporting = false; }
}
