import { flowchartNodeBounds } from "../transform/geometry";
import { transformRoots } from "../arrange/selection";
import { readFlowchart } from "../model/document";
import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { layoutRanks } from "./ranks";
import { layoutScope } from "./scope";
import type { FlowchartLayout } from "./types";

/** @param a - Proposed world rectangle. @param b - Fixed world rectangle. @returns Whether 24 px obstacle clearance is violated. */
function collides(a: FlowchartNode, b: FlowchartNode): boolean {
  return a.x < b.x + b.width + 24 && a.x + a.width + 24 > b.x && a.y < b.y + b.height + 24 && a.y + a.height + 24 > b.y;
}
/** @param document - Immutable source. @param ids - Selection or empty top level. @param command - Layer direction. @returns Validated atomic layout; locked geometry, containment and manual bends are preserved. */
export function layoutFlowchart(document: FlowchartDocument, ids: readonly string[], command: FlowchartLayout): FlowchartDocument {
  document = readFlowchart(document);
  if (command !== "layout-down" && command !== "layout-right") throw new TypeError("未知自动布局方向");
  const scope = layoutScope(document,ids), originals = new Map(scope.roots.map(n=>[n.id,n]));
  const roots = scope.roots.map(n=>({...n,...flowchartNodeBounds(n)})), rows = layoutRanks(document,{...scope,roots}), down = command === "layout-down";
  const primary = down ? "y" : "x", cross = down ? "x" : "y", length = down ? "height" : "width", breadth = down ? "width" : "height";
  const occupied = [...scope.obstacles.map(n=>({...n,...flowchartNodeBounds(n)})),...roots.filter(n => scope.pinned.has(n.id))], updates = new Map<string,FlowchartNode>();
  const start = scope.owner ? {x:scope.owner.x + (scope.owner.shape === "lane-horizontal" ? Math.min(104,scope.owner.width/4)+24 : 24),y:scope.owner.y + (scope.owner.shape === "lane-horizontal" ? 24 : 48)} : {x:Math.min(...roots.map(n => n.x)),y:Math.min(...roots.map(n => n.y))};
  const spans = rows.map(row => row.reduce((sum,n)=>sum+n[breadth],0) + Math.max(0,row.length-1)*48), widest = Math.max(...spans);
  let level = start[primary], comparisons = 0;
  for (const [i,row] of rows.entries()) {
    let cursor = start[cross] + (widest - spans[i]!) / 2;
    for (const node of row) {
      if (!scope.pinned.has(node.id)) {
        let next = {...node,[primary]:level,[cross]:cursor};
        // Monotonic cross-axis advancement terminates after at most one pass per
        // obstacle. It preserves pinned rectangles without a hidden retry loop.
        for (let attempt=0;attempt<=occupied.length;attempt++) {
          comparisons += occupied.length;
          if (comparisons > 2000000) throw new RangeError("布局障碍过多，请缩小选区后重试");
          const hits=occupied.filter(other=>collides(next,other)); if (!hits.length) break;
          next={...next,[cross]:Math.max(...hits.map(n=>n[cross]+n[breadth]+48))};
        }
        if (scope.owner?.shape.startsWith("lane-") && (next.x + next.width > scope.owner.x + scope.owner.width - 24 || next.y + next.height > scope.owner.y + scope.owner.height - 24)) throw new Error("泳道空间不足，请先扩大泳道或减少选区");
        const original=originals.get(node.id)!;
        updates.set(node.id,{...original,x:original.x+next.x-node.x,y:original.y+next.y-node.y}); occupied.push(next); cursor=next[cross];
      }
      cursor+=node[breadth]+48;
    }
    level+=Math.max(...row.map(n=>n[length]))+80;
  }
  return readFlowchart(transformRoots(document,updates));
}
