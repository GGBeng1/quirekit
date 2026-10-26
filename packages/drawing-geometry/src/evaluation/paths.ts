import type { PresetPath } from "../presets/types";
import { resolveDrawingArc } from "./arcs";
import { resolveGeometryValue } from "./formulas";
import type { DrawingGeometryPoint, DrawingGeometrySegment, ResolvedDrawingPath } from "./types";

/**
 * Evaluates one path without mixing frame coordinates with explicit path units.
 * @param path - Declarative ordered path.
 * @param values - Completed shape guide environment.
 * @returns Numeric path with independent paint flags.
 */
export function resolveGeometryPath(path: PresetPath, values: ReadonlyMap<string, number>): ResolvedDrawingPath {
  /** @param token - Coordinate expression. @returns Resolved local scalar. */
  const scalar = (token: string): number => resolveGeometryValue(token, values);
  /** @param x - X expression. @param y - Y expression. @returns Resolved local point. */
  const point = (x: string, y: string): DrawingGeometryPoint => ({ x: scalar(x), y: scalar(y) });
  let current: DrawingGeometryPoint = { x: 0, y: 0 }, beginning = current;
  const segments: DrawingGeometrySegment[] = [];
  for (const operation of path.commands) {
    const kind = operation[0];
    if (kind === "Z") {
      segments.push({ kind: "close-path" }); current = beginning;
    } else if (kind === "A") {
      const arc = resolveDrawingArc(current, scalar(operation[1]), scalar(operation[2]), scalar(operation[3]), scalar(operation[4]));
      segments.push(...arc);
      const last = arc.at(-1);
      if (last && last.kind !== "close-path") current = last.point;
    } else if (kind === "M" || kind === "L") {
      current = point(operation[1], operation[2]);
      if (kind === "M") beginning = current;
      segments.push({ kind: kind === "M" ? "move-to" : "line-to", point: current });
    } else if (kind === "Q") {
      current = point(operation[3], operation[4]);
      segments.push({ kind: "quadratic-curve-to", control: point(operation[1], operation[2]), point: current });
    } else if (kind === "C") {
      current = point(operation[5], operation[6]);
      segments.push({ kind: "bezier-curve-to", control1: point(operation[1], operation[2]), control2: point(operation[3], operation[4]), point: current });
    }
  }
  return { width: path.width === null ? values.get("w")! : scalar(path.width),
    height: path.height === null ? values.get("h")! : scalar(path.height),
    fill: path.fill !== "none", fillMode: path.fill, stroke: path.stroke, segments };
}
