import {
  resolveEditorUIBlockDragAutoScrollDecision,
  resolveEditorUIBlockDropTarget
} from "@quirekit/editor-ui";
import { resolveMountedPointerAutoScrollAxisDelta } from "../../../pointer/auto-scroll";
import { createBlockResolverOptions, createBlockSnapshot } from "../fixture";

/** Browser result proving mounted Canvas/SVG retained-geometry equivalence. */
export interface BrowserBlockGeometryResult {
  /** Canvas-backed target resolution. */
  readonly canvas: ReturnType<typeof resolveEditorUIBlockDropTarget>;
  /** SVG-backed target resolution. */
  readonly svg: ReturnType<typeof resolveEditorUIBlockDropTarget>;
  /** Canvas-backed cross-page scroll decision. */
  readonly canvasScroll: ReturnType<typeof resolveEditorUIBlockDragAutoScrollDecision>;
  /** SVG-backed cross-page scroll decision. */
  readonly svgScroll: ReturnType<typeof resolveEditorUIBlockDragAutoScrollDecision>;
}

/**
 * Runs retained-geometry targeting against real mounted Canvas and SVG surfaces.
 *
 * @returns Equivalent Canvas/SVG target and auto-scroll results.
 */
export function runBlockGeometryFixture(): BrowserBlockGeometryResult {
  const snapshot = createBlockSnapshot();
  const canvasRect = requireElement("canvas-surface").getBoundingClientRect();
  const svgRect = requireElement("svg-surface").getBoundingClientRect();
  const canvas = resolveEditorUIBlockDropTarget({
    ...createBlockResolverOptions(snapshot),
    clientPoint: projectDocumentPoint(canvasRect, 80, 105),
    surfaceClientRect: canvasRect,
    surfaceBounds: { x: 0, y: 0, width: 400, height: 400 }
  });
  const svg = resolveEditorUIBlockDropTarget({
    ...createBlockResolverOptions(snapshot),
    clientPoint: projectDocumentPoint(svgRect, 80, 105),
    surfaceClientRect: svgRect,
    surfaceBounds: { x: 0, y: 0, width: 400, height: 400 }
  });
  return {
    canvas,
    svg,
    canvasScroll: resolveBrowserAutoScrollDecision(
      canvasRect,
      { x: canvasRect.left + canvasRect.width / 2, y: canvasRect.bottom - 6 }
    ),
    svgScroll: resolveBrowserAutoScrollDecision(
      svgRect,
      { x: svgRect.left + svgRect.width / 2, y: svgRect.bottom - 6 }
    )
  };
}

/**
 * Combines existing mounted edge pressure with the headless logical decision.
 *
 * @param rect - Real browser scrollport rectangle.
 * @param point - Real client-space pointer point.
 * @returns Typed logical scroll decision.
 */
function resolveBrowserAutoScrollDecision(
  rect: DOMRect,
  point: { readonly x: number; readonly y: number }
): ReturnType<typeof resolveEditorUIBlockDragAutoScrollDecision> {
  const threshold = 40;
  return resolveEditorUIBlockDragAutoScrollDecision({
    deltaX: resolveMountedPointerAutoScrollAxisDelta(
      point.x,
      rect.left,
      rect.width,
      threshold,
      threshold
    ),
    deltaY: resolveMountedPointerAutoScrollAxisDelta(
      point.y,
      rect.top,
      rect.height,
      threshold,
      threshold
    ),
    writingDirection: "ltr"
  });
}

/**
 * Projects one document point through a real browser surface rectangle.
 *
 * @param rect - Browser client rectangle.
 * @param x - Document x coordinate.
 * @param y - Document y coordinate.
 * @returns Browser client point.
 */
function projectDocumentPoint(
  rect: DOMRect,
  x: number,
  y: number
): { readonly x: number; readonly y: number } {
  return {
    x: rect.left + x * rect.width / 400,
    y: rect.top + y * rect.height / 400
  };
}

/**
 * Requires one fixture element.
 *
 * @param id - Element id.
 * @returns Mounted fixture element.
 */
function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (element === null) throw new Error(`Missing browser fixture element: ${id}`);
  return element;
}
