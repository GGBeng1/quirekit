import type { QuireRect } from "@quirekit/renderer";
import type { HtmlMeasuredClientRect } from "../measurement";
import type { HtmlFlowRenderOptions, HtmlFlowRenderResult } from "./types";

/**
 * Publishes continuous DOM geometry and actual selection products for mounted consumers.
 * @param options - Browser geometry measured after retained writes settle.
 * @returns HTML render facts without Engine frame, page, or pagination-cache products.
 */
export function createHtmlFlowRenderResult(options: HtmlFlowRenderOptions): HtmlFlowRenderResult {
  const { snapshot, domGeometry } = options;
  const selection = snapshot.state.pm.selection;
  /**
   * Projects one measured client rectangle into continuous surface coordinates.
   * @param rect - Browser-owned client geometry.
   * @returns Surface-relative rectangle.
   */
  const project = (rect: HtmlMeasuredClientRect): QuireRect => ({
    x: rect.left - domGeometry.surfaceClientRect.left,
    y: rect.top - domGeometry.surfaceClientRect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  });
  const displayList = { bounds: options.surfaceState.surfaceBounds, commands: [] };
  return {
    layoutSnapshot: snapshot,
    interactionSnapshot: snapshot,
    updatePatch: options.updatePatch,
    selectionGeometry: {
      carets: domGeometry.caret ? [{ position: { pos: selection.head, bias: 1 }, rect: project(domGeometry.caret) }] : [],
      ranges: domGeometry.selectionRects.map(rect => ({ range: { from: selection.from, to: selection.to }, rect: project(rect) }))
    },
    // Persistent content/decorations/widgets already live in retained DOM. The
    // HTML backend does not build a second paint tree for that same content.
    decorationLane: {
      invisibleCharacters: [], interactionTargets: [], backgrounds: [], textStyles: [],
      nodes: [], pointMarkers: [], gutterMarkers: [], widgets: [], diagnostics: []
    },
    displayList,
    contentDisplayList: displayList,
    overlayDisplayList: displayList,
    domOverlays: [],
    viewTargets: []
  };
}
