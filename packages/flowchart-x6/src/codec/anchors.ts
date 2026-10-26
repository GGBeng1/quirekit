import { flowchartNodePoint } from "@quirekit/flowchart";
import { readNode } from "./read";
import type { Graph } from "@antv/x6";

/** @param GraphClass - Lazily loaded vendor constructor. Registers node-box-relative anchors independently of the painted header bounds. */
export function registerRelativeAnchor(GraphClass: typeof Graph): void {
  GraphClass.registerAnchor("quirekit-relative", (view, _magnet, _reference, args) => {
    const node = readNode(view.cell), point = flowchartNodePoint(node, { x: node.width * Number(args.x), y: node.height * Number(args.y) });
    const origin = view.cell.getBBox().getOrigin();
    return origin.translate(point.x - origin.x, point.y - origin.y);
  }, true);
}
