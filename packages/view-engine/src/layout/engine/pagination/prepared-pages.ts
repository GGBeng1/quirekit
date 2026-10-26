import type { QuirePageFragment } from "@quirekit/layout/pagination";

/**
 * Drops optional query provenance from an exact prepared page without traversing it.
 *
 * The full prepared result may still serve independent pagination callers. A
 * shallow page copy preserves its geometry and source-flow authority without
 * retaining or translating the duplicate source-fragment list in canonical pages.
 *
 * @param page - Full page produced by the accepted prepared job.
 * @returns Equivalent projection page without query provenance.
 */
export function omitQuirePageSourceFragments(page: QuirePageFragment): QuirePageFragment {
  const { sourceFragments: _sourceFragments, ...flowPage } = page;
  return flowPage;
}
