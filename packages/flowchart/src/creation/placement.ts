import type { FlowchartNode, FlowchartPoint } from "../model/types";
import { flowchartNodeBounds } from "../transform/geometry";
import { assertInsideOwner } from "../geometry/bounds";
import type { FlowchartDirection } from "./types";

/** @param node - Rotated and possibly mirrored shape. @param direction - World-space exit direction. @returns Normalized local anchor preserving the world direction. */
export function directionAnchor(node: FlowchartNode, direction: FlowchartDirection): FlowchartPoint {
  const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0, dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const angle = (node.rotation ?? 0) * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  const x = (dx * c + dy * s) / node.width, y = (-dx * s + dy * c) / node.height, scale = 0.5 / Math.max(Math.abs(x), Math.abs(y));
  return { x: 0.5 + x * scale * (node.flipX ? -1 : 1), y: 0.5 + y * scale * (node.flipY ? -1 : 1) };
}
/** @param source - Existing node. @param next - New unrotated shape. @param direction - World-space placement. @param siblings - Same-owner collision candidates. @param parent - Fixed owner boundary, if any. @returns Empty position found in at most 64 candidates. */
export function placeConnectedNode(source: FlowchartNode, next: FlowchartNode, direction: FlowchartDirection, siblings: readonly FlowchartNode[], parent?: FlowchartNode): FlowchartNode {
  const box = flowchartNodeBounds(source), horizontal = direction === "right" || direction === "left", positive = direction === "right" || direction === "down";
  const obstacles = siblings.map(flowchartNodeBounds), crossOffsets = [0, 1, -1, 2, -2, 3, -3];
  // Search a small deterministic fan in world space. No canvas or screen scale
  // participates, and failure never moves neighbors or silently leaves an owner.
  for (let index = 0; index < 64; index++) {
    const ahead = Math.floor(index / crossOffsets.length), cross = crossOffsets[index % crossOffsets.length]!;
    const distance = 80 + ahead * ((horizontal ? next.width : next.height) + 80);
    const candidate = { ...next,
      x: horizontal ? positive ? box.x + box.width + distance : box.x - distance - next.width : box.x + (box.width - next.width) / 2 + cross * (next.width + 40),
      y: horizontal ? box.y + (box.height - next.height) / 2 + cross * (next.height + 40) : positive ? box.y + box.height + distance : box.y - distance - next.height,
    };
    if (candidate.x < -1e6 || candidate.y < -1e6 || candidate.x > 1e6 || candidate.y > 1e6) continue;
    if (parent) { try { assertInsideOwner(candidate, parent); } catch { continue; } }
    if (obstacles.some(other => candidate.x < other.x + other.width + 16 && candidate.x + candidate.width + 16 > other.x
      && candidate.y < other.y + other.height + 16 && candidate.y + candidate.height + 16 > other.y)) continue;
    return candidate;
  }
  throw new RangeError("该方向没有足够空间，请调整图形或选择其他方向");
}
