import type { QuireRect } from "@quirekit/renderer";
import type { ClassicEditorZoomMode } from "../../types";
import type { ClassicEditorStagePage } from "./types";

/**
 * Reserves readable review space independently of the scale being calculated.
 * @param width - Workspace client width in CSS pixels.
 * @param visible - Whether the document companion rail is open.
 * @returns Unscaled rail width, with no scale/measurement feedback loop.
 */
export function calculateFitRailWidth(width: number, visible: boolean): number {
  return visible ? Math.min(340, Math.max(240, Math.floor(width / 4))) : 0;
}

/**
 * Fits canonical page dimensions into client space with a small reading gutter.
 * @param mode - Automatic reading strategy.
 * @param paperWidth - Unscaled full stage width, shared by mixed paper sizes.
 * @param paperHeight - Tallest unscaled page, not the document stack height.
 * @param viewportWidth - Client width after independent panels have taken their space.
 * @param viewportHeight - Client height below the toolbar and ruler.
 * @param railWidth - Unscaled companion width reserved by the same stage pass.
 * @returns Bounded integer percentage, or undefined until measurements are usable.
 */
export function calculateFitZoom(
  mode: Exclude<ClassicEditorZoomMode, "manual" | "fit-content">,
  paperWidth: number,
  paperHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  railWidth: number
): number | undefined {
  if (paperWidth <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return undefined;
  const widthScale = (viewportWidth - railWidth - 32) / paperWidth;
  if (mode === "fit-page" && paperHeight <= 0) return undefined;
  const scale = mode === "fit-page" ? Math.min(widthScale, (viewportHeight - 32) / paperHeight) : widthScale;
  return Math.min(400, Math.max(25, Math.floor(scale * 100)));
}

/**
 * Locates the page nearest a reading anchor without visiting every page.
 * @param pages - Public layout page table, ordered vertically in document CSS pixels.
 * @param y - Reading anchor in the same unscaled document coordinates.
 * @returns Closest page rectangle, or undefined before pagination exists.
 */
export function findReadingPage(pages: readonly ClassicEditorStagePage[], y: number): QuireRect | undefined {
  return findReadingStagePage(pages, y)?.pageRect;
}

/** @param pages - Ordered page records. @param y - Reading anchor in document pixels. @returns Closest public page record. */
export function findReadingStagePage(pages: readonly ClassicEditorStagePage[], y: number): ClassicEditorStagePage | undefined {
  let low = 0;
  let high = pages.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const rect = pages[middle]!.pageRect;
    if (rect.y + rect.height / 2 < y) low = middle + 1;
    else high = middle;
  }
  const after = pages[low]?.pageRect;
  const before = pages[low - 1]?.pageRect;
  if (!before) return pages[low];
  if (!after) return pages[low - 1];
  return pages[y - (before.y + before.height / 2) <= after.y + after.height / 2 - y ? low - 1 : low];
}

/**
 * Fits the laid-out body without changing the paper or paragraph geometry.
 * @param body - Canonical body rectangle of the reading page.
 * @param width - Available viewport width in client CSS pixels.
 * @returns Fit percentage with a 12px touch gutter on each side.
 */
export function calculateContentFitZoom(body: QuireRect | undefined, width: number): number | undefined {
  if (!body || body.width <= 0 || width <= 24) return undefined;
  return Math.min(400, Math.max(25, Math.floor((width - 24) / body.width * 100)));
}
