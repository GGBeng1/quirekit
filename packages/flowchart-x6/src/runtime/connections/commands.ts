import { updateSelectedEdges } from "./format";
import type { FlowRuntime } from "../types";
import { routeSelectedOutside } from "./routes/commands";
import { arrangeSelectedLabels } from "./labels/commands";
import type { FlowchartPort } from "@quirekit/flowchart";

/** @param runtime - Writable, unlocked selection. @param command - Connection editing intent. */
export function executeConnection(runtime: FlowRuntime, command: string): void {
  if (command === "edge-label-avoid") { arrangeSelectedLabels(runtime); return; }
  if (command.startsWith("edge-route-")) {
    const side = command.slice(11); if (!["top", "right", "bottom", "left"].includes(side)) throw new TypeError("未知连线编辑命令");
    routeSelectedOutside(runtime, side as FlowchartPort); return;
  }
  updateSelectedEdges(runtime, edge => {
    switch (command) {
      case "edge-reset-bends": return { ...edge, vertices: [] };
      case "edge-label-reset": return { ...edge, labelPosition: 0.5, labelOffset: 12 };
      case "edge-label-start": return { ...edge, labelPosition: 0.25 };
      case "edge-label-middle": return { ...edge, labelPosition: 0.5 };
      case "edge-label-end": return { ...edge, labelPosition: 0.75 };
      case "edge-label-above": return { ...edge, labelOffset: -16 };
      case "edge-label-on": return { ...edge, labelOffset: 0 };
      case "edge-label-below": return { ...edge, labelOffset: 16 };
      default: throw new TypeError("未知连线编辑命令");
    }
  });
}
