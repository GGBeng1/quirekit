import type { QuireViewRenderResult } from "../../../types";

/**
 * Reads render-time DOM overlays that are not already owned by the layout snapshot.
 *
 * @param overlays - Full DOM overlay list carried by the previous render result.
 * @param layoutOverlays - DOM overlays already retained by the layout snapshot.
 * @param replacedOverlayIds - Render-time overlay ids rebuilt by this update.
 * @returns Render-only overlays that still need interaction snapshot targets.
 */
export function readRenderOnlyDomOverlays(
  overlays: QuireViewRenderResult["domOverlays"],
  layoutOverlays: QuireViewRenderResult["layoutSnapshot"]["domOverlays"],
  replacedOverlayIds: ReadonlySet<string> = new Set()
): QuireViewRenderResult["domOverlays"] {
  const safeOverlays = overlays ?? [];
  const safeLayoutOverlays = layoutOverlays ?? [];
  const layoutOverlayIds = new Set(
    safeLayoutOverlays.map((overlay) => overlay.id)
  );

  return safeOverlays.filter((overlay) =>
    !layoutOverlayIds.has(overlay.id)
    && !replacedOverlayIds.has(overlay.id)
  );
}
