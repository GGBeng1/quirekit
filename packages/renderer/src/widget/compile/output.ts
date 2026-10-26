import type { QuireRect } from "../../core/geometry";
import type { QuireCompiledViewNode } from "../types";

/**
 * Combines child output under a parent rectangle.
 *
 * @param rect - Parent rectangle.
 * @param children - Compiled children.
 * @returns Combined display output.
 */
export function combineCompiledChildren(
  rect: QuireRect,
  children: readonly QuireCompiledViewNode[]
): QuireCompiledViewNode {
  return {
    rect,
    commands: children.flatMap((child) => child.commands),
    domOverlays: children.flatMap((child) => child.domOverlays),
    targets: children.flatMap((child) => child.targets ?? [])
  };
}
