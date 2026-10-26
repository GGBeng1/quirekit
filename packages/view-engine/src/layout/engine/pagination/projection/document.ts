import {
  doesQuireRectIntersectAny,
  doQuireDocumentRangesIntersect,
  normalizeQuirePositiveAreaRects,
  type QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutBox, QuireLayoutDocument } from "../../types";
import { collectQuireTableHitTargets } from "../../table";
import {
  createQuirePageBodyProjections,
  doesQuireLayoutBoxIntersectProjectionRange,
  filterQuireLayoutBoxesByProjectionRanges
} from "./page";
import { projectQuireLayoutBoxes } from "./project-box";
import { compileQuireInlineSourceVisualOccurrences } from "./anchor-occurrence";
import { compileQuireInlineRetainedProducts } from "../../inline/retained-product";
import {
  filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds
} from "../../inline/source-capability";
import type {
  QuireLayoutDocumentPageProjectionOptions,
  QuirePageBodyProjection
} from "./types";
import { traceQuireLayoutPhase } from "../../trace";
import { hasQuirePageMeasuredSourceFlowBand } from "./source-flow";
import { resolveQuireProjectionOccurrence } from "./occurrence";
import { containsQuireFloatingTable } from "./translate/floating-table";

/**
 * Projects complete boxes and split text fragments into resolved page body rectangles.
 *
 * @param options - Paginated layout document to project.
 * @returns Layout document with page-contained boxes, anchors, and hit targets translated.
 */
export function projectQuireLayoutDocumentToPages(
  options: QuireLayoutDocumentPageProjectionOptions
): QuireLayoutDocument {
  const trace = options.trace;
  const projectionClipRects = normalizeQuirePositiveAreaRects(
    options.projectionClipRects
  );
  const projections = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:create-projections",
    () =>
      createQuirePageBodyProjections(
        options.document.children,
        options.document.pages,
        options.sourceFlowX ?? options.document.rect.x,
        projectionClipRects
      )
  );

  // Preserve the legacy unmeasured entry only inside its page stack. The
  // compatibility preparer omits off-window bands, but that does not make an
  // off-document window unpaginated or permit exposing source coordinates.
  if (
    projections.length === 0 &&
    !options.document.pages.some(hasQuirePageMeasuredSourceFlowBand) &&
    (projectionClipRects === undefined ||
      options.document.pages.length === 0 ||
      options.document.pages.some((page) =>
        doesQuireRectIntersectAny(page.pageRect, projectionClipRects)
      ))
  ) {
    return options.document;
  }

  const sourceChildren = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:source-filter",
    () =>
      projectionClipRects === undefined
        ? options.document.children
        : filterQuireLayoutBoxesByProjectionRanges(
            options.document.children,
            projections
          )
  );
  const projectedChildren = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:boxes",
    () => projectQuireLayoutBoxes(sourceChildren, projections, trace)
  );
  const children = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:clip-filter",
    () =>
      projectionClipRects === undefined
        ? projectedChildren
        : filterQuireProjectedLayoutBoxesByClip(
            projectedChildren,
            projectionClipRects,
            projections
          )
  );
  const anchorOccurrences = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:anchors",
    () => compileQuireInlineSourceVisualOccurrences({
      anchors: options.document.anchors,
      projections: projections.map((projection) => ({
        pageIndex: projection.page.pageIndex,
        sourceRange: projection.page.range,
        visualInstanceId: `page:${resolveQuireProjectionOccurrence(projection)}`,
        columnRect: projection.page.bodyRect,
        marginRect: projection.marginRect ?? projection.page.bodyRect,
        pageRect: projection.page.pageRect,
        dx: projection.dx,
        dy: projection.dy
      })),
      mode: projectionClipRects === undefined ? "complete" : "mounted-window"
    })
  );
  const hitTargets = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:hit-targets",
      () => collectQuireProjectedTableHitTargets(children)
  );
  const sourceCapabilities =
    filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds(
      options.document.sourceCapabilities ?? [],
      anchorOccurrences.anchors.map((anchor) => anchor.sourceAnchorId)
    );
  const anchorCompilation = traceQuireLayoutPhase(
    trace,
    "layout:paginate:project:anchor-products",
    () => compileQuireInlineRetainedProducts(
      anchorOccurrences.anchors,
      sourceCapabilities
    )
  );

  return {
    ...options.document,
    children,
    sourceCapabilities,
    anchors: anchorOccurrences.anchors,
    anchorOccurrenceGaps: [
      ...options.document.anchorOccurrenceGaps,
      ...anchorOccurrences.gaps
    ],
    anchorRegionProducts: anchorCompilation.products,
    anchorPlacementGaps: [
      ...anchorCompilation.placementGaps,
      ...(options.document.flowExclusionGaps ?? [])
    ],
    hitTargets
  };
}

/**
 * Removes projected boxes outside the active projection window.
 *
 * @param boxes - Projected or source-flow boxes returned by the projector.
 * @param clipRects - Active document-space page rectangles.
 * @param projections - Active page projections that own the visible ranges.
 * @returns Only boxes that intersect the projection clip.
 */
function filterQuireProjectedLayoutBoxesByClip(
  boxes: readonly QuireLayoutDocument["children"][number][],
  clipRects: readonly QuireRect[],
  projections: readonly QuirePageBodyProjection[]
): readonly QuireLayoutDocument["children"][number][] {
  const filtered: QuireLayoutDocument["children"][number][] = [];

  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]!;
    const clipRect = box.paintBounds ?? box.table?.rect ?? box.rect;
    if (
      (doesQuireRectIntersectAny(clipRect, clipRects)
        || (box.table === undefined && containsQuireFloatingTable(box))) &&
      doesQuireLayoutBoxIntersectProjectionRange(box, projections)
    ) {
      filtered.push(box);
    }
  }

  return filtered;
}

/**
 * Collects table hit targets without using `flatMap` in the transaction hot path.
 *
 * @param children - Projected layout boxes.
 * @returns Table hit targets exposed by projected children.
 */
function collectQuireProjectedTableHitTargets(
  children: readonly QuireLayoutDocument["children"][number][]
): QuireLayoutDocument["hitTargets"] {
  const hitTargets: QuireLayoutDocument["hitTargets"][number][] = [];

  for (let index = 0; index < children.length; index += 1) {
    const childTargets = collectQuireTableHitTargets(children[index]!);
    for (let targetIndex = 0; targetIndex < childTargets.length; targetIndex += 1) {
      hitTargets.push(childTargets[targetIndex]!);
    }
  }

  return hitTargets;
}
