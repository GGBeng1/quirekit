import type { FlowchartPort, FlowchartTerminal } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../types";
import { updateSelectedEdges } from "../format";
import { outsideRoute } from "./geometry";
import type { RouteBox } from "./types";

/** @param runtime - Writable selected edges. @param side - Explicit outside channel, replacing manual bends in one history batch. */
export function routeSelectedOutside(runtime: FlowRuntime, side: FlowchartPort): void {
  /** @param terminal - Free point or attached node. @returns World geometry without viewport projection. */
  function box(terminal: FlowchartTerminal): RouteBox {
    if (!("node" in terminal)) return { ...terminal, width: 0, height: 0 };
    const cell = runtime.graph.getCellById(terminal.node);
    return cell.getBBox().bbox(cell.isNode() ? cell.getAngle() : 0);
  }
  updateSelectedEdges(runtime, edge => ({ ...edge, routing: "orthogonal", vertices: outsideRoute(box(edge.source), box(edge.target), side) }));
}
