import type { Graph, Rectangle } from "@antv/x6";
import { readNode } from "../codec/read";

/** @param graph - Idle graph whose source and routing projection are frozen for output. @returns World content window, excluding image pixels outside their retained frame while including actual captions and routed edges. */
export function exportContentBounds(graph: Graph): Rectangle {
  if (!graph.getNodes().some(node => !!readNode(node).image)) return graph.getContentArea({ useCellGeometry: false });
  // Native SVG getBBox ignores clipping. Image frames are the visible authority;
  // other views retain their actual label/edge extents, inverted once from the
  // viewport. This scan belongs only to the explicit export barrier.
  const boxes = graph.getCells().map(cell => {
    if (cell.isNode() && readNode(cell).image) return cell.getBBox().bbox(cell.getAngle());
    const view = graph.findViewByCell(cell);
    return view ? graph.graphToLocal(view.getBBox()) : cell.getBBox();
  });
  const x = Math.min(...boxes.map(box => box.x)), y = Math.min(...boxes.map(box => box.y));
  return boxes[0]!.clone().update(x, y, Math.max(...boxes.map(box => box.right)) - x, Math.max(...boxes.map(box => box.bottom)) - y);
}
