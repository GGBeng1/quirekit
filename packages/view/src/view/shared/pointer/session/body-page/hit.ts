import type {
  QuireHitTestResult,
  QuireLayoutPage,
  QuireLayoutSnapshot,
  QuirePositionHitTestResult
} from "@quirekit/view-engine";
import {
  createQuireInteractionGeometryDiagnostics,
  mergeQuireInteractionDiagnostics,
  resolveQuireInteractionPageBodyNearestCaret,
  resolveQuireHitTestSelectionTarget
} from "@quirekit/view-engine";
import type { QuirePoint } from "@quirekit/renderer";
import {
  containsMountedBodyPageVerticalPoint,
  resolveMountedBodyPageEdgeProjectionContext
} from "./projection";

/** Inputs used to resolve a page-local body caret for one drag head. */
interface ResolveMountedBodyPageEdgeHitOptions {
  /** Retained interaction snapshot that owns page and caret geometry. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Raw moving-end hit carrying the original pointer coordinate diagnostics. */
  readonly hitTestResult: QuireHitTestResult;
  /** Canonical body source whose page-local subtree may answer the query. */
  readonly sourceId: string;
}

/**
 * Resolves a page-local body hit when a drag head is still in page chrome.
 *
 * @param options - Retained interaction snapshot and raw moving-end hit.
 * @returns Page-local body caret hit, or null when page projection is unavailable.
 */
export function resolveMountedBodyPageEdgeHit(
  options: ResolveMountedBodyPageEdgeHitOptions
): QuirePositionHitTestResult | null {
  const point = options.hitTestResult.diagnostics?.coordinatePath?.documentPoint;
  const pages = options.snapshot.pages;
  if (point === undefined || pages === undefined) {
    return null;
  }

  const projection = resolveMountedBodyPageEdgeProjectionContext(
    { pages, point },
    resolveForcedBodyPageEdge(options.hitTestResult, pages, point)
  );
  if (projection === null) {
    return null;
  }

  const nearestCaret = resolveQuireInteractionPageBodyNearestCaret({
    snapshot: options.snapshot,
    page: projection.page,
    point: projection.point,
    sourceId: options.sourceId
  });
  if (nearestCaret.kind === "miss") {
    return null;
  }

  const {
    kind: _kind,
    source,
    snapshotVersion,
    ...hit
  } = nearestCaret;
  const projectedDiagnostics = createQuireInteractionGeometryDiagnostics({
    source,
    ...(snapshotVersion === undefined ? {} : { snapshotVersion }),
    ...(hit.viewRegion === undefined ? {} : { viewRegion: hit.viewRegion }),
    ...(hit.queryOwner === undefined ? {} : { queryOwner: hit.queryOwner }),
    ...(hit.layer === undefined ? {} : { layer: hit.layer }),
    ...(hit.pointerPolicy === undefined ? {} : { pointerPolicy: hit.pointerPolicy }),
    ...(hit.interactionHit === undefined ? {} : { interactionHit: hit.interactionHit }),
    ...(hit.layerHitChain === undefined ? {} : { layerHitChain: hit.layerHitChain }),
    ...(hit.layerTargetIndexQuery === undefined
      ? {}
      : { layerTargetIndexQuery: hit.layerTargetIndexQuery }),
    ...(hit.targetChain === undefined ? {} : { targetChain: hit.targetChain })
  });

  return {
    kind: "position",
    ...hit,
    diagnostics: mergeQuireInteractionDiagnostics(
      options.hitTestResult.diagnostics,
      projectedDiagnostics
    )
  };
}

/**
 * Corrects escaped hits only while the original point is inside a page body.
 * Page chrome and gaps keep coordinate-owned page and edge together: a nearby
 * next-page header must not force a preceding gap back to that page's start.
 *
 * @param hitTestResult - Raw moving endpoint hit.
 * @param pages - Retained pages owning body ranges.
 * @param point - Original document-space pointer point.
 * @returns Forced page edge, or undefined for an ordinary page-local body hit.
 */
function resolveForcedBodyPageEdge(
  hitTestResult: QuireHitTestResult,
  pages: readonly QuireLayoutPage[],
  point: QuirePoint
): "start" | "end" | undefined {
  const bodyPage = pages.find((page) =>
    containsMountedBodyPageVerticalPoint(page.bodyRect, point.y)
  );
  if (bodyPage === undefined) {
    return undefined;
  }

  const targetKind = resolveQuireHitTestSelectionTarget({
    hitTestResult
  })?.region?.kind;
  if (targetKind === "header") {
    return "start";
  }
  if (targetKind === "footer") {
    return "end";
  }
  if (hitTestResult.kind === "miss") {
    return undefined;
  }

  if (hitTestResult.position.pos < bodyPage.range.from) {
    return "start";
  }
  if (hitTestResult.position.pos > bodyPage.range.to) {
    return "end";
  }
  return undefined;
}
