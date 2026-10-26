import type { EdgeView, Graph } from "@antv/x6";
import type { FlowchartDrawingStyle } from "@quirekit/flowchart";
import { sketchPaths } from "./rough";

let registered = false;
/** @param GraphClass - Lazily imported X6 constructor. Registers derived geometry without owning a graph or global theme. */
export function registerDrawingAttributes(GraphClass: typeof Graph): void {
  if (registered) return;
  GraphClass.registerAttr("quirekitSketch", {
    /** @param value - Explicit pen configuration. @param context - Vendor view with resolved precise path. @returns Sketch-only attributes; nominal connection remains unchanged. */
    set(value, context) {
      const config = value as { id: string; drawing: FlowchartDrawingStyle; width: number };
      const view = context.view as EdgeView, connection = view.getConnection();
      if (!connection || config.drawing === "standard") return { d: "" };
      const start = connection.start, local = connection.clone().translate(-start.x, -start.y);
      const path = sketchPaths(local.serialize(), config.id, config.drawing, config.width, 0);
      return { d: path.outline, transform: `translate(${start.x},${start.y})` };
    },
  }, true);
  registered = true;
}
