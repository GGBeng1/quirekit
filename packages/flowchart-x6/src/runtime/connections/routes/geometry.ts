import type { FlowchartPoint, FlowchartPort, FlowchartTerminal } from "@quirekit/flowchart";
import type { RouteBox } from "./types";

/** @param terminal - Canonical attachment. @returns Explicit outward direction; internal anchors remain unrestricted. */
export function terminalDirection(terminal: FlowchartTerminal): FlowchartPort | undefined {
  if (!("node" in terminal)) return undefined;
  if (terminal.port) return terminal.port;
  const p = terminal.anchor;
  return !p ? undefined : p.x === 0 ? "left" : p.x === 1 ? "right" : p.y === 0 ? "top" : p.y === 1 ? "bottom" : undefined;
}
/** @param a - Source world box. @param b - Target world box. @param side - Explicit return channel. @returns Two manual waypoints beyond both endpoints. */
export function outsideRoute(a: RouteBox, b: RouteBox, side: FlowchartPort): FlowchartPoint[] {
  const x = side === "left" ? Math.min(a.x, b.x) - 48 : Math.max(a.x + a.width, b.x + b.width) + 48;
  const y = side === "top" ? Math.min(a.y, b.y) - 48 : Math.max(a.y + a.height, b.y + b.height) + 48;
  return side === "top" || side === "bottom"
    ? [{ x: a.x + a.width / 2, y }, { x: b.x + b.width / 2, y }]
    : [{ x, y: a.y + a.height / 2 }, { x, y: b.y + b.height / 2 }];
}
/** @param box - Self-connected node world box. @param source - Current source anchor. @param target - Current target anchor. @param start - Outward source direction. @param end - Outward target direction. @returns Derived outside guides, never persisted as user bends. */
export function selfLoopGuides(box: RouteBox, source: FlowchartPoint, target: FlowchartPoint, start: FlowchartPort = "right", end: FlowchartPort = "top"): FlowchartPoint[] {
  const left = box.x - 48, right = box.x + box.width + 48, top = box.y - 48, bottom = box.y + box.height + 48;
  /** @param side - Outward direction. @param anchor - Terminal position. @returns Projection on the external rectangle. */
  function project(side: FlowchartPort, anchor: FlowchartPoint): FlowchartPoint {
    return side === "left" || side === "right" ? { x: side === "left" ? left : right, y: anchor.y }
      : { x: anchor.x, y: side === "top" ? top : bottom };
  }
  if (start === end) {
    // Coincident ports need two distinct approach lanes. A closed perimeter
    // would retrace its last segment and make the arrow impossible to read.
    const a = project(start, source), b = project(end, target);
    return start === "left" || start === "right"
      ? [a, { x: a.x, y: top }, { x: a.x + (start === "right" ? -24 : 24), y: top }, { x: a.x + (start === "right" ? -24 : 24), y: b.y }]
      : [a, { x: right, y: a.y }, { x: right, y: a.y + (start === "bottom" ? -24 : 24) }, { x: b.x, y: a.y + (start === "bottom" ? -24 : 24) }];
  }
  const sides: FlowchartPort[] = ["top", "right", "bottom", "left"];
  const corners = [{ x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }, { x: left, y: top }];
  let index = sides.indexOf(start);
  const clockwise = (sides.indexOf(end) - index + 4) % 4 <= 2;
  const result = [project(start, source)];
  while (sides[(index + 4) % 4] !== end) {
    result.push(corners[(index + (clockwise ? 0 : 3) + 4) % 4]!);
    index += clockwise ? 1 : -1;
  }
  result.push(project(end, target));
  return result;
}
