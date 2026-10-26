import type { QuireLayoutCommandOwnerRef } from "@quirekit/layout/identity";
import { translateQuireLayoutBox } from "../../../layout/engine/pagination/projection/translate";
import {
  projectQuireLayoutBoxViewProductsToPage
} from "../../../layout/engine/pagination/projection/split-box/visual-instance";
import {
  compileQuireInlineSourceVisualOccurrences
} from "../../../layout/engine/pagination/projection/anchor-occurrence";
import {
  compileQuireInlineRetainedProducts
} from "../../../layout/engine/inline/retained-product";
import {
  filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds
} from "../../../layout/engine/inline/source-capability";
import type {
  QuireLayoutContainer,
  QuireLayoutDocument
} from "../../../layout/engine/types";
import { attachQuireStoryCommandOwner } from "./command-owner";
import { identifyQuireStoryLayoutOccurrence } from "./identity";
import type { QuirePageBandStoryInstanceResult, QuirePageBandStorySourceLayout } from "./types";
import { instantiateQuirePageBandFields } from "./fields";
import type {
  QuirePageBand,
  QuirePageModelProfile,
  QuirePageSection
} from "../../../document-profile/types";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import { collectQuireInlineSourceLayoutAnchors } from "../../../layout/engine/inline/source-anchor";
import { reflowQuirePageBandOccurrence } from "./reflow";
import type { QuirePaginationTextFacts } from "../occurrence-text/types";
import type { QuirePaginationTextDiagnostic } from "../../../layout/engine/types";

/**
 * Creates one translated and reidentified story occurrence.
 *
 * @param source - Canonical measured source layout.
 * @param kind - Page band the story occupies.
 * @param commandOwner - Structural section governing this page occurrence.
 * @param page - Concrete page and body rectangles in document space.
 * @param distance - Distance from the page edge in CSS pixels.
 * @param section - Section supplying occurrence-specific field values.
 * @param pageCount - Final physical page count in the current layout document.
 * @param textMeasurer - Canonical measurer shared with paragraph layout.
 * @param pageModel - Page numbering semantics supplied by the document profile.
 * @param sectionPageIndex - Local index for numbering, separate from global occurrence identity.
 * @param origin - Explicit document-space top-left for stories outside the page bands.
 * @param facts - Effective section ordinal/count and canonical policy source.
 * @returns Page-local story layout and compiled floating-object products.
 */
export function createQuirePageBandStoryInstance(
  source: QuirePageBandStorySourceLayout,
  kind: QuirePageBand,
  commandOwner: QuireLayoutCommandOwnerRef,
  page: QuireLayoutDocument["pages"][number],
  distance: number,
  section: QuirePageSection,
  pageCount: number,
  textMeasurer: QuireTextMeasurer,
  pageModel: QuirePageModelProfile,
  sectionPageIndex = page.pageIndex,
  origin?: { readonly x: number; readonly y: number },
  facts?: Partial<QuirePaginationTextFacts>
): QuirePageBandStoryInstanceResult {
  const paginationTextDiagnostics: QuirePaginationTextDiagnostic[] = [];
  let evaluatedCapabilities = instantiateQuirePageBandFields(
    source.sourceCapabilities,
    section,
    sectionPageIndex,
    pageCount,
    textMeasurer,
    pageModel,
    facts,
    paginationTextDiagnostics
  );
  let occurrenceSource = reflowQuirePageBandOccurrence(
    source.layout,
    evaluatedCapabilities
  );
  // Band height feeds body geometry before pagination. Until height feedback is
  // admitted, a formatted recipe that changes it retains its complete source.
  if (Math.abs(occurrenceSource.rect.height - source.layout.rect.height) > 0.001
    && source.sourceCapabilities.some(item => item.status === "resolved" && item.presentation.occurrenceText?.formatToken !== undefined)) {
    paginationTextDiagnostics.push(...source.sourceCapabilities.flatMap(item => item.status === "resolved" && item.presentation.occurrenceText
      ? [{ sourceAnchorId: item.sourceAnchorId, code: "unsupported-pagination-text-context" as const,
        message: "Page-band result height feedback is not admitted; stored text and measured band geometry are retained." }] : []));
    evaluatedCapabilities = source.sourceCapabilities;
    occurrenceSource = source.layout;
  }
  const storyY = origin?.y ?? (kind === "header"
    ? page.pageRect.y + distance
    : page.pageRect.y + page.pageRect.height - distance - occurrenceSource.rect.height);
  const dx = (origin?.x ?? page.bodyRect.x) - occurrenceSource.rect.x;
  const dy = storyY - occurrenceSource.rect.y;
  const ownedSource = attachQuireStoryCommandOwner(occurrenceSource, commandOwner);
  const translated = translateQuireLayoutBox(ownedSource, {
    dx,
    dy
  }) as QuireLayoutContainer;
  const visualInstanceId = `page:${page.pageIndex}:${source.layout.id}`;
  const viewProducts = projectQuireLayoutBoxViewProductsToPage(
    ownedSource,
    page.pageIndex,
    translated.rect,
    visualInstanceId
  );

  // Page occurrence compilation owns placement references and identity. Story
  // measurement remains source-local, while the governing section is attached
  // only to this concrete occurrence.
  const ownedAnchors = ownedSource.layoutOwner === undefined
    ? source.anchors.map((anchor) => ({
        ...anchor,
        owner: {
          ...anchor.owner,
          region: {
            ...anchor.owner.region,
            commandOwner
          }
        }
      }))
    : collectQuireInlineSourceLayoutAnchors(
        ownedSource,
        ownedSource.layoutOwner
      );
  const occurrenceResult = compileQuireInlineSourceVisualOccurrences({
    anchors: ownedAnchors,
    projections: [{
      pageIndex: page.pageIndex,
      sourceRange: source.layout.range,
      visualInstanceId,
      columnRect: page.bodyRect,
      marginRect: page.bodyRect,
      pageRect: page.pageRect,
      dx,
      dy
    }],
    mode: "complete"
  });
  const anchors = viewProducts.layoutOwner === undefined
    ? occurrenceResult.anchors
    : occurrenceResult.anchors.map((anchor) => ({
        ...anchor,
        interactionScope: viewProducts.layoutOwner
      }));
  const sourceCapabilities = filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds(
    evaluatedCapabilities,
    anchors.map((anchor) => anchor.sourceAnchorId)
  );
  const anchorCompilation = compileQuireInlineRetainedProducts(
    anchors,
    sourceCapabilities
  );

  return {
    ...(paginationTextDiagnostics.length === 0 ? {} : { paginationTextDiagnostics }),
    instance: identifyQuireStoryLayoutOccurrence({
      ...translated,
      ...viewProducts
    }, visualInstanceId, page.pageIndex),
    anchors,
    sourceCapabilities,
    occurrenceGaps: occurrenceResult.gaps,
    regionProducts: anchorCompilation.products,
    placementGaps: anchorCompilation.placementGaps
  };
}
