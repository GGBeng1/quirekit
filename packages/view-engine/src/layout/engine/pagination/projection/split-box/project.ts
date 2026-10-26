import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../types";
import type { QuireLayoutTraceSink } from "@quirekit/layout/inline";
import { sliceQuireInlineTextRunsToRange } from "@quirekit/layout/inline";
import { sliceQuireInlineSourceProductsToRange } from "../../../inline/source-capability";
import {
  bucketQuirePageContent,
  type QuirePageContentBucket
} from "../content-bucket";
import { isQuireLayoutContainer } from "../guards";
import { forwardQuireLayoutSignature } from "@quirekit/layout/block-flow";
import {
  unionQuireContentRange,
  unionQuireContentRect
} from "./union";
import { splitQuireTableLayoutContainerAcrossPages } from "./table";
import { trySplitOrderedMeasuredTextLeafAcrossPages } from "./text-leaf/split";
import { projectTextBlockBand } from "./text-leaf/geometry";
import { projectQuireLayoutBoxViewProductsToPage } from "./visual-instance";
import { splitQuireSubLayoutOwnerAcrossPages } from "./sub-layout";
import type { QuirePageBodyProjection } from "../types";
import { filterQuireContainerChildrenForProjections } from "../page";
import { resolveQuireProjectionOccurrence } from "../occurrence";

/**
 * Splits a layout box whose document range crosses page boundaries into one
 * page-local box per page its content falls on.
 *
 * A straddling box cannot be translated as a whole because no single projection
 * contains its range. Instead its owned text fragments (already page-contained)
 * are projected and grouped by page, so each resulting box has a page-local
 * `rect`, the document range its content covers, and a unique per-page id. This
 * keeps hit testing, selection rectangles, caret geometry, and decorations
 * behaving like any non-straddling box.
 *
 * @param box - Straddling layout box in infinite-flow coordinates.
 * @param projections - Available page-body projections.
 * @param projectChildren - Recursive projector used for container children.
 * @param trace - Optional trace sink receiving split subphase timings.
 * @returns Page-local occurrences, or an empty list when no page owns content.
 */
export function splitQuireLayoutBoxAcrossPages(
  box: QuireLayoutBox,
  projections: readonly QuirePageBodyProjection[],
  projectChildren: (
    boxes: readonly QuireLayoutBox[],
    projections: readonly QuirePageBodyProjection[]
  ) => readonly QuireLayoutBox[],
  trace?: QuireLayoutTraceSink | undefined
): readonly QuireLayoutBox[] {
  const subLayoutSplit = splitQuireSubLayoutOwnerAcrossPages(box, projections);
  if (subLayoutSplit !== null) {
    return subLayoutSplit;
  }

  if (isQuireLayoutContainer(box)) {
    return splitQuireLayoutContainerAcrossPages(box, projections, projectChildren);
  }

  return splitQuireLayoutLeafAcrossPages(box, projections, trace);
}

/**
 * Splits a straddling leaf box into per-page boxes derived from its fragments.
 *
 * @param box - Straddling leaf box owning text fragments.
 * @param projections - Available page-body projections.
 * @param trace - Optional trace sink receiving split subphase timings.
 * @returns Page-local boxes, or an empty list when no fragment maps.
 */
function splitQuireLayoutLeafAcrossPages(
  box: QuireLayoutBox,
  projections: readonly QuirePageBodyProjection[],
  trace: QuireLayoutTraceSink | undefined
): readonly QuireLayoutBox[] {
  const textFragments = box.textFragments ?? [];
  const orderedTextSplit = trySplitOrderedMeasuredTextLeafAcrossPages(
    box,
    textFragments,
    projections,
    trace
  );
  if (orderedTextSplit !== undefined) {
    return orderedTextSplit;
  }

  const buckets = bucketQuirePageContent({
    fragments: textFragments,
    children: [],
    projections
  });

  return buckets.map((bucket, index) => createSplitLeafPageBox(
    box,
    bucket,
    index === 0,
    index === buckets.length - 1
  ));
}

/**
 * Creates one page-local fallback text leaf box without opening lazy source properties.
 *
 * @param box - Source-flow text leaf box.
 * @param bucket - Page-local bucket derived from the source leaf.
 * @param isFirstFragment - Whether this bucket owns the paragraph top edge.
 * @param isLastFragment - Whether this bucket owns the paragraph bottom edge.
 * @returns Page-local text leaf box.
 */
function createSplitLeafPageBox(
  box: QuireLayoutBox,
  bucket: QuirePageContentBucket,
  isFirstFragment: boolean,
  isLastFragment: boolean
): QuireLayoutBox {
  const range = unionQuireContentRange(bucket);
  const rect = box.inlineLayoutRect === undefined ? unionQuireContentRect(bucket)
    : projectTextBlockBand(box.rect, bucket.projection, unionQuireContentRect(bucket));
  const pageBox: QuireLayoutBox = {
    id: `${box.id}#p${resolveQuireProjectionOccurrence(bucket.projection)}`,
    range,
    rect,
    ...(box.inlineLayoutRect === undefined
      ? {}
      : {
          inlineLayoutRect: projectTextBlockBand(
            box.inlineLayoutRect,
            bucket.projection,
            rect
          )
        }),
    ...(box.nodeHandle === undefined ? {} : { nodeHandle: box.nodeHandle }),
    ...(box.table === undefined ? {} : { table: box.table }),
    ...(box.paragraphDecoration === undefined
      ? {}
      : {
          paragraphDecoration: {
            ...box.paragraphDecoration,
            firstFragment: box.paragraphDecoration.firstFragment && isFirstFragment,
            lastFragment: box.paragraphDecoration.lastFragment && isLastFragment
          }
        }),
    ...(box.textRuns === undefined
      ? {}
      : { textRuns: sliceQuireInlineTextRunsToRange(box.textRuns, range) }),
    ...sliceQuireInlineSourceProductsToRange(box, range),
    textFragments: bucket.fragments
  };

  return forwardQuireLayoutSignature(pageBox, box);
}

/**
 * Splits a straddling container into per-page containers around projected children.
 *
 * @param box - Straddling container box.
 * @param projections - Available page-body projections.
 * @param projectChildren - Recursive projector used for the container children.
 * @returns Page-local containers, or an empty list when no content maps.
 */
function splitQuireLayoutContainerAcrossPages(
  box: QuireLayoutContainer,
  projections: readonly QuirePageBodyProjection[],
  projectChildren: (
    boxes: readonly QuireLayoutBox[],
    projections: readonly QuirePageBodyProjection[]
  ) => readonly QuireLayoutBox[]
): readonly QuireLayoutBox[] {
  if (box.table !== undefined) {
    return splitQuireTableLayoutContainerAcrossPages({
      box,
      sourceTable: box.table,
      projections
    });
  }

  // Children that cannot reach an active page contribute nothing; a long
  // container would otherwise offer each of them to every projected window.
  const buckets = bucketQuirePageContent({
    fragments: box.textFragments ?? [],
    children: projectChildren(filterQuireContainerChildrenForProjections(box.children, projections), projections),
    projections
  });

  return buckets.map((bucket) => {
    const range = unionQuireContentRange(bucket);
    const rect = unionQuireContentRect(bucket);
    const container: QuireLayoutContainer = {
      ...box,
      id: `${box.id}#p${resolveQuireProjectionOccurrence(bucket.projection)}`,
      range,
      rect,
      ...projectQuireLayoutBoxViewProductsToPage(
        box,
        resolveQuireProjectionOccurrence(bucket.projection),
        rect
      ),
      ...(box.inlineLayoutRect === undefined
        ? {}
        : {
            inlineLayoutRect: projectTextBlockBand(
              box.inlineLayoutRect,
              bucket.projection,
              rect
            )
          }),
      // Replace owned source text even when this page contains only children.
      ...(box.textFragments === undefined ? {} : { textFragments: bucket.fragments }),
      ...(box.textRuns === undefined
        ? {}
        : { textRuns: sliceQuireInlineTextRunsToRange(box.textRuns, range) }),
      ...sliceQuireInlineSourceProductsToRange(box, range),
      children: bucket.children
    };

    return container;
  });
}
