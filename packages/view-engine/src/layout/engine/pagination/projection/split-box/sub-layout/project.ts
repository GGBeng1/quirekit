import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutBox, QuireLayoutContainer } from "../../../../types";
import { readQuireSubLayoutFragments } from "../../../../sub-layout";
import { clipQuireRectToSourceFlowClip, createQuireProjectionSourceFlowClip } from "../../source-flow";
import type { QuirePageBodyProjection } from "../../types";
import { translateQuireRect } from "../../translate";
import { projectQuireLayoutBoxViewProductsToPage } from "../visual-instance";
import { projectQuireSubLayoutProjectionToPage } from "./result";
import { resolveQuireProjectionOccurrence } from "../../occurrence";

/**
 * Splits a retained sub-layout owner into page-local occurrences.
 *
 * @param box - Source-flow owner carrying canonical sub-layout fragments.
 * @param projections - Available measured page projections.
 * @returns Page-local owners, or null when the box has no sub-layout fragments.
 */
export function splitQuireSubLayoutOwnerAcrossPages(
  box: QuireLayoutBox,
  projections: readonly QuirePageBodyProjection[]
): readonly QuireLayoutBox[] | null {
  const fragments = readQuireSubLayoutFragments(box);
  if (fragments.length === 0 || box.table !== undefined) {
    return null;
  }

  const pages: QuireLayoutBox[] = [];
  for (const projection of projections) {
    const subLayoutFragments = fragments.flatMap((fragment) => {
      const projected = projectQuireSubLayoutProjectionToPage(
        fragment.subLayout,
        projection
      );
      return projected === null ? [] : [projected];
    });
    if (subLayoutFragments.length === 0) {
      continue;
    }

    const range = unionProjectedRanges(subLayoutFragments.flatMap((fragment) =>
      fragment.subLayout.geometry.fragments.map((child) => child.range)
    ));
    const sourceRect = clipQuireRectToSourceFlowClip(
      box.rect,
      createQuireProjectionSourceFlowClip(projection)
    );
    if (range === null || sourceRect === null) {
      continue;
    }
    const rect = translateQuireRect(sourceRect, projection);
    const common = {
      ...box,
      id: `${box.id}#p${resolveQuireProjectionOccurrence(projection)}`,
      range,
      rect,
      ...projectQuireLayoutBoxViewProductsToPage(
        box,
        resolveQuireProjectionOccurrence(projection),
        rect
      ),
      subLayoutFragments
    };

    if (!isLayoutContainer(box)) {
      pages.push(common);
      continue;
    }
    const container: QuireLayoutContainer = {
      ...common,
      children: subLayoutFragments.flatMap((fragment) =>
        fragment.subLayout.view.fragmentSources.map((source) => source.sourceBox)
      )
    };
    pages.push(container);
  }

  return pages;
}

/**
 * Computes the document range covered by projected child fragments.
 *
 * @param ranges - Projected child ranges.
 * @returns Union range, or null when no child survived projection.
 */
function unionProjectedRanges(
  ranges: readonly QuireDocumentRange[]
): QuireDocumentRange | null {
  if (ranges.length === 0) {
    return null;
  }
  return {
    from: Math.min(...ranges.map((range) => range.from)),
    to: Math.max(...ranges.map((range) => range.to))
  };
}

/**
 * Reports whether one owner is a recursive layout container.
 *
 * @param box - Layout box to inspect.
 * @returns Whether the box carries direct children.
 */
function isLayoutContainer(box: QuireLayoutBox): box is QuireLayoutContainer {
  return Array.isArray((box as Partial<QuireLayoutContainer>).children);
}
