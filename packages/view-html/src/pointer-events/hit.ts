import { resolveQuireHitTestSelectionTarget, type QuireHitTestResult } from "@quirekit/view-engine";
import { resolveHtmlTableCellHit } from "../measurement/table";
import type {
  QuireViewPointerHitTestResult,
  QuireViewPointerSelectionOptions
} from "@quirekit/view/mounted-backend";
import type { HtmlDomMeasurementProvider } from "../measurement";

/**
 * Replaces a layout-derived pointer position with retained browser DOM geometry.
 *
 * @param provider - Retained DOM measurement authority.
 * @param options - Browser point and current geometry snapshot.
 * @returns Pointer hit with retained DOM position authority.
 */
export function measureHtmlMountedPointerHit(
  provider: HtmlDomMeasurementProvider,
  options: QuireViewPointerSelectionOptions
): QuireViewPointerHitTestResult {
  const measured = provider.posAtClientPoint(
    options.clientPoint.clientX,
    options.clientPoint.clientY
  );
  if (!measured) {
    return {
      geometrySnapshot: options.geometrySnapshot,
      hitTestResult: { kind: "miss" },
      interactionTarget: null
    };
  }
  const caretRect = measured.nodeSelection ? provider.nodeSelectionRect(measured.pos) : provider.coordsAtPos(measured.pos, 1);
  const surface = options.canvasClientRect;
  const bounds = options.surfaceBounds ?? {
    x: 0,
    y: 0,
    width: surface.width,
    height: surface.height
  };
  const scaleX = surface.width === 0 ? 1 : bounds.width / surface.width;
  const scaleY = surface.height === 0 ? 1 : bounds.height / surface.height;
  const tableModel = options.geometrySnapshot.documentProfile?.tableModel;
  const tableCell = tableModel && resolveHtmlTableCellHit(options.geometrySnapshot.state.doc, tableModel, provider, measured.pos, surface);
  const hitTestResult: QuireHitTestResult = {
    kind: "position",
    position: { pos: measured.pos, bias: 1 },
    inside: measured.inside,
    ...(measured.nodeSelection ? { selectionPolicy: "node-selection" as const } : {}),
    ...(tableCell === undefined ? {} : { tableCell }),
    rect: {
      x: bounds.x + (caretRect.left - surface.left) * scaleX,
      y: bounds.y + (caretRect.top - surface.top) * scaleY,
      width: Math.max((caretRect.right - caretRect.left) * scaleX, 1),
      height: Math.max((caretRect.bottom - caretRect.top) * scaleY, 1)
    },
    ownerSource: measured.source,
    ownerCapabilities: {
      editable: true,
      selectable: true,
      focusable: true,
      copyable: true,
      commandable: true,
      accessible: true
    },
    viewRegion: {
      rootId: { value: measured.rootId },
      regionId: { value: measured.regionId },
      kind: "body"
    }
  };

  return {
    geometrySnapshot: options.geometrySnapshot,
    hitTestResult,
    interactionTarget: resolveQuireHitTestSelectionTarget({ hitTestResult })
  };
}
