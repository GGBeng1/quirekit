import type { QuireRect } from "@quirekit/renderer";
import {
  createQuireInteractionGeometryAuthority,
  createQuireInteractionGeometryDiagnostics
} from "@quirekit/view-engine";
import type {
  QuireInteractionDiagnostics,
  QuireInteractionInputAnchorDiagnosticSource
} from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import { isMountedInputProxyAnchorOnVisibleLine } from "./line-match";
import type { MountedInputProxyAnchorResult } from "./types";

/**
 * Resolves the current input proxy anchor through interaction geometry products.
 *
 * @param renderResult - Latest mounted render result.
 * @returns Anchor rectangle for input proxy placement.
 */
export function resolveMountedInputProxyAnchor(
  renderResult: QuireViewRenderResult
): QuireRect {
  return resolveMountedInputProxyAnchorWithDiagnostics(renderResult).rect;
}

/**
 * Resolves the current input proxy anchor and reports its retained geometry source.
 *
 * @param renderResult - Latest mounted render result.
 * @returns Anchor rectangle plus input-anchor diagnostics.
 */
export function resolveMountedInputProxyAnchorWithDiagnostics(
  renderResult: QuireViewRenderResult
): MountedInputProxyAnchorResult {
  const snapshot = renderResult.interactionSnapshot;
  const selection = snapshot.state.pm.selection;
  const selectionContext = renderResult.selectionContext;
  const role = selection.empty ? "caret" : "selection";
  const geometryAuthority = createQuireInteractionGeometryAuthority({
    snapshot
  });
  const renderedSelectionRect = selection.empty
    ? renderResult.selectionGeometry.carets[0]?.rect
    : renderResult.selectionGeometry.ranges[0]?.rect;
  const rectAtSelection = selection.empty
    ? geometryAuthority.coordsAtPos(selection.from, 1, selectionContext)
    : null;
  const caretAnchor = selection.empty
    ? geometryAuthority.caretAtPosition(selection.from, undefined, selectionContext)
    : null;
  const selectionGeometry = selection.empty
    ? null
    : geometryAuthority.selectionRects({
        from: selection.from,
        to: selection.to
      }, selectionContext);
  const referenceRect =
    renderedSelectionRect ??
    (rectAtSelection?.source === "viewport-fallback"
      ? caretAnchor?.rect
      : rectAtSelection?.rect
        ?? caretAnchor?.rect
        ?? selectionGeometry?.ranges[0]?.rect);
  const subLayoutAnchor = geometryAuthority.inputAnchor(
    selection.from,
    role,
    referenceRect
  );

  if (
    subLayoutAnchor !== null &&
    isMountedInputProxyAnchorOnVisibleLine(subLayoutAnchor.rect, referenceRect)
  ) {
    return createMountedInputProxyGeometryAnchorResult({
      rect: subLayoutAnchor.rect,
      source: "sub-layout-input-anchor",
      diagnostics: createQuireInteractionGeometryDiagnostics({
        source: subLayoutAnchor.source,
        ...(subLayoutAnchor.queryOwner === undefined
          ? {}
          : { queryOwner: subLayoutAnchor.queryOwner }),
        ...(subLayoutAnchor.viewRegion === undefined
          ? {}
          : { viewRegion: subLayoutAnchor.viewRegion }),
        ...(subLayoutAnchor.snapshotVersion === undefined
          ? {}
          : { snapshotVersion: subLayoutAnchor.snapshotVersion })
      }),
      position: selection.from,
      role
    });
  }

  if (selection.empty) {
    if (caretAnchor !== null) {
      return createMountedInputProxyGeometryAnchorResult({
        rect: caretAnchor.rect,
        source: "layout-caret",
        diagnostics: createQuireInteractionGeometryDiagnostics({
          source: caretAnchor.source,
          ...(caretAnchor.queryOwner === undefined
            ? {}
            : { queryOwner: caretAnchor.queryOwner }),
          ...(caretAnchor.viewRegion === undefined
            ? {}
            : { viewRegion: caretAnchor.viewRegion }),
          ...(caretAnchor.snapshotVersion === undefined
            ? {}
            : { snapshotVersion: caretAnchor.snapshotVersion })
        }),
        position: selection.from,
        role
      });
    }
  } else if (selectionGeometry !== null) {
    const selectionAnchor = selectionGeometry.ranges[0];

    if (selectionAnchor !== undefined) {
      return createMountedInputProxyGeometryAnchorResult({
        rect: selectionAnchor.rect,
        source: "layout-selection-rects",
        diagnostics: createQuireInteractionGeometryDiagnostics({
          source: selectionGeometry.source,
          ...(selectionGeometry.queryOwner === undefined
            ? {}
            : { queryOwner: selectionGeometry.queryOwner }),
          ...(selectionGeometry.viewRegion === undefined
            ? {}
            : { viewRegion: selectionGeometry.viewRegion }),
          ...(selectionGeometry.snapshotVersion === undefined
            ? {}
            : { snapshotVersion: selectionGeometry.snapshotVersion })
        }),
        position: selection.from,
        role
      });
    }
  }

  return createMountedInputProxyViewportFallbackResult(renderResult, role);
}

/**
 * Creates a mounted input anchor result from interaction geometry diagnostics.
 *
 * @param options - Anchor rectangle, source, diagnostics, and active selection facts.
 * @returns Mounted input proxy anchor result.
 */
function createMountedInputProxyGeometryAnchorResult(options: {
  readonly rect: QuireRect;
  readonly source: QuireInteractionInputAnchorDiagnosticSource;
  readonly diagnostics: QuireInteractionDiagnostics;
  readonly position: number;
  readonly role: "caret" | "selection";
}): MountedInputProxyAnchorResult {
  return {
    rect: options.rect,
    ...(options.diagnostics.queryOwner === undefined
      ? {}
      : { queryOwner: options.diagnostics.queryOwner }),
    ...(options.diagnostics.rootRegion?.region === undefined
      ? {}
      : { viewRegion: options.diagnostics.rootRegion.region }),
    diagnostics: {
      ...options.diagnostics,
      inputAnchor: {
        source: options.source,
        position: options.position,
        role: options.role,
        rect: options.rect
      }
    }
  };
}

/**
 * Creates the explicit viewport fallback input anchor result.
 *
 * @param renderResult - Latest mounted render result.
 * @param role - Input anchor role requested by the active selection.
 * @returns Mounted input proxy anchor result using the viewport rectangle.
 */
function createMountedInputProxyViewportFallbackResult(
  renderResult: QuireViewRenderResult,
  role: "caret" | "selection"
): MountedInputProxyAnchorResult {
  const snapshot = renderResult.interactionSnapshot;
  const selection = snapshot.state.pm.selection;
  const snapshotVersion = snapshot.viewGraph?.version;

  return {
    rect: snapshot.viewportRect,
    diagnostics: {
      ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
      inputAnchor: {
        source: "viewport-fallback",
        position: selection.from,
        role,
        rect: snapshot.viewportRect
      },
      migrationFallbacks: [
        {
          kind: "input-anchor-viewport-fallback",
          reason: "No retained input anchor, caret, or selection rectangle was available for mounted input placement."
        }
      ]
    }
  };
}
