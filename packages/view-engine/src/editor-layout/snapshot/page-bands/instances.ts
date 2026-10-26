import type {
  QuireInlineSourceVisualOccurrenceGap
} from "@quirekit/layout/inline";
import type { QuirePageModelProfile } from "../../../document-profile/types";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { doesQuireRectIntersectAny, type QuireRect } from "@quirekit/renderer";
import type {
  QuireInlinePlacementGap
} from "../../../layout/engine/inline/placement-reference";
import type {
  QuireLayoutAnchor,
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../../../layout/engine/types";
import {
  mergeQuireRetainedRegionProductSets,
  type QuireRetainedRegionProducts
} from "../../../layout/region-products";
import {
  createQuirePageBandStoryInstance
} from "./occurrence";
import type { QuirePageBandStorySourceLayout } from "./types";
import type { SectionLayoutContext } from "../sections/types";
import { omitPageBandRanges } from "./omit";

/** Options for attaching derived story occurrences to paginated body layout. */
export interface AttachQuirePageBandInstancesOptions {
  /** Actual multi-section page owner and final whole-document page count. */
  readonly sectionContext?: SectionLayoutContext | undefined;
  /** Shared ProseMirror document containing the section and story references. */
  readonly documentNode: ProseMirrorNode;
  /** Already paginated body layout document. */
  readonly layoutDocument: QuireLayoutDocument;
  /** Canonical measured story sources from the infinite-layout pass. */
  readonly sources: readonly QuirePageBandStorySourceLayout[];
  /** Canonical measurer shared with source paragraph layout. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Page semantics supplied by the document profile. */
  readonly pageModel: QuirePageModelProfile;
  /** Document-space projection window; pages outside it receive no occurrences. */
  readonly clipRects?: readonly QuireRect[] | undefined;
}

/**
 * Attaches repeated page-local header/footer story layout occurrences.
 *
 * @param options - Persisted source document, body pages, and canonical stories.
 * @returns Layout document with story occurrences appended after body content.
 */
export function attachQuirePageBandInstances(
  options: AttachQuirePageBandInstancesOptions
): QuireLayoutDocument {
  const { pageModel } = options;
  const leading = pageModel.leadingSection(options.documentNode);
  if (
    leading === null
    || options.layoutDocument.pages.length === 0
    || options.sources.length === 0
  ) {
    return options.layoutDocument;
  }

  const section = options.sectionContext?.section ?? leading;
  const sources = new Map(options.sources.map((source) => [source.storyId, source]));
  const instances: QuireLayoutContainer[] = [];
  const anchors: QuireLayoutAnchor[] = [];
  const occurrenceGaps: QuireInlineSourceVisualOccurrenceGap[] = [];
  const regionProducts: QuireRetainedRegionProducts[] = [];
  const placementGaps: QuireInlinePlacementGap[] = [];
  const paginationTextDiagnostics = [...options.layoutDocument.paginationTextDiagnostics ?? []];
  const sourceCapabilities = new Map(
    (options.layoutDocument.sourceCapabilities ?? []).map(
      (capability) => [capability.sourceAnchorId, capability]
    )
  );

  for (const page of options.layoutDocument.pages) {
    if (options.sectionContext?.sharesFirstPage === true && page.pageIndex === options.sectionContext.pageIndexOffset) {
      continue;
    }
    // Like body projection, occurrences exist only for windowed pages; a window
    // change reprojects and instantiates the newly visible pages.
    if (options.clipRects !== undefined && !doesQuireRectIntersectAny(page.pageRect, options.clipRects)) {
      continue;
    }
    for (const kind of ["header", "footer"] as const) {
      const storyId = pageModel.bandStory({
        doc: options.documentNode,
        section,
        band: kind,
        sectionPageIndex: page.pageIndex - (options.sectionContext?.pageIndexOffset ?? 0)
      });
      const source = storyId === null
        ? undefined
        : sources.get(storyId);
      if (source === undefined || source.kind !== kind) {
        continue;
      }

      const distance = pageModel.bandDistance(section, kind);
      if (distance === null) {
        continue;
      }

      const result = createQuirePageBandStoryInstance(
        omitPageBandRanges(source, options.sectionContext?.omittedBandRanges),
        kind,
        {
          position: options.sectionContext?.section.position ?? 0,
          nodeType: section.nodeType,
          ...(section.stableId === null ? {} : { stableId: section.stableId })
        },
        page,
        distance,
        section,
        options.sectionContext?.pageCount() ?? options.layoutDocument.pages.length,
        options.textMeasurer,
        pageModel,
        page.pageIndex - (options.sectionContext?.pageIndexOffset ?? 0),
        undefined,
        { sectionNumber: options.sectionContext?.sectionNumber ?? 1,
          sectionPageCount: options.sectionContext?.sectionPageCount?.() ?? options.layoutDocument.pages.length,
          documentNode: options.documentNode,
          bodyRanges: options.sectionContext?.pageBodyRanges?.(page.pageIndex) ?? [page.range] }
      );
      instances.push(result.instance);
      paginationTextDiagnostics.push(...result.paginationTextDiagnostics ?? []);
      anchors.push(...result.anchors);
      occurrenceGaps.push(...result.occurrenceGaps);
      regionProducts.push(result.regionProducts);
      placementGaps.push(...result.placementGaps);
      for (const capability of result.sourceCapabilities) {
        sourceCapabilities.set(capability.sourceAnchorId, capability);
      }
    }
  }

  return instances.length === 0
    ? options.layoutDocument
    : {
        ...options.layoutDocument,
        children: [...options.layoutDocument.children, ...instances],
        ...(paginationTextDiagnostics.length === 0 ? {} : { paginationTextDiagnostics }),
        anchors: [...options.layoutDocument.anchors, ...anchors],
        sourceCapabilities: [...sourceCapabilities.values()],
        anchorOccurrenceGaps: [
          ...options.layoutDocument.anchorOccurrenceGaps,
          ...occurrenceGaps
        ],
        anchorRegionProducts: mergeQuireRetainedRegionProductSets([
          options.layoutDocument.anchorRegionProducts,
          ...regionProducts
        ]) ?? options.layoutDocument.anchorRegionProducts,
        anchorPlacementGaps: [
          ...options.layoutDocument.anchorPlacementGaps,
          ...placementGaps
        ]
      };
}
