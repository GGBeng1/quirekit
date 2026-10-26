import { qkView } from "@quirekit/renderer";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuirePageModelProfile, QuirePageSection } from "../../../document-profile/types";
import type {
  QuireInlineSourceCapabilitySidecar
} from "../../../layout/engine/inline/source-capability";
import { resolveQuirePaginationTextValue } from "../occurrence-text/value";
import type { QuirePaginationTextFacts } from "../occurrence-text/types";
import type { QuirePaginationTextDiagnostic } from "../../../layout/engine/types";

/**
 * Evaluates semantic field presentations for one concrete physical page.
 *
 * @param capabilities - Source-local inline capabilities.
 * @param section - Section whose numbering settings govern the occurrence.
 * @param pageIndex - Zero-based page index inside the section.
 * @param pageCount - Final physical page count in the current layout document.
 * @param textMeasurer - Canonical measurer shared with paragraph layout.
 * @param pageModel - Page numbering semantics supplied by the document profile.
 * @param facts - Section ordinal/count and canonical source policy facts.
 * @param diagnostics - Optional observable preservation reasons for this occurrence.
 * @returns Capabilities whose page-number and page-count views contain occurrence values.
 */
export function instantiateQuirePageBandFields(
  capabilities: readonly QuireInlineSourceCapabilitySidecar[],
  section: QuirePageSection,
  pageIndex: number,
  pageCount: number,
  textMeasurer: QuireTextMeasurer,
  pageModel: QuirePageModelProfile,
  facts?: Partial<QuirePaginationTextFacts>,
  diagnostics?: QuirePaginationTextDiagnostic[]
): readonly QuireInlineSourceCapabilitySidecar[] {
  return capabilities.map((capability) => {
    if (
      capability.status !== "resolved"
      || capability.presentation.occurrenceText === undefined
    ) {
      return capability;
    }
    const value = resolveQuirePaginationTextValue(capability.presentation.occurrenceText, section,
      { pageIndex, pageCount, sectionNumber: facts?.sectionNumber ?? 1, sectionPageCount: facts?.sectionPageCount ?? pageCount,
        ...(facts?.bodyRanges === undefined ? {} : { bodyRanges: facts.bodyRanges }),
        ...(facts?.documentNode === undefined ? {} : { documentNode: facts.documentNode }) }, pageModel);
    if (value === null) {
      diagnostics?.push({ sourceAnchorId: capability.sourceAnchorId, code: "unsupported-pagination-text-context",
        message: "The document profile retains this stored page-band result for an unsupported pagination policy." });
      return capability;
    }
    const sourceView = capability.presentation.view;
    if (sourceView.kind !== "text") {
      return capability;
    }
    const font = sourceView.style?.font ?? "16px sans-serif";
    const inlineSize = textMeasurer.measureText(value, font).width;
    const blockSize = sourceView.height ?? capability.placement.extent.blockSize;
    return {
      ...capability,
      placement: {
        ...capability.placement,
        extent: {
          ...capability.placement.extent,
          inlineSize,
          blockSize
        }
      },
      presentation: {
        ...capability.presentation,
        view: qkView.text({
          id: `${capability.placement.objectId}:page:${pageIndex}`,
          text: value,
          width: inlineSize,
          height: blockSize,
          ...(sourceView.style === undefined ? {} : { style: sourceView.style })
        }),
        presentationSignature: [
          capability.presentation.presentationSignature ?? capability.placement.objectId,
          pageIndex,
          pageCount,
          value
        ].join(":")
      }
    };
  });
}
