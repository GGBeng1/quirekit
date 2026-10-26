import {
  sliceQuireInlineSourceAnchorsToRange,
  type QuireInlineSourceAnchor
} from "@quirekit/layout/inline";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutBox } from "../../types";
import type { QuireInlineSourceCapabilitySidecar } from "./types";

/**
 * Keeps only View sidecars whose logical anchors survive a range projection.
 *
 * @param sidecars - Source capability products before projection.
 * @param anchors - Logical anchors retained by the projected layout box.
 * @returns Sidecars keyed by surviving source anchor identities.
 */
export function sliceQuireInlineSourceCapabilitySidecarsToAnchors(
  sidecars: readonly QuireInlineSourceCapabilitySidecar[],
  anchors: readonly QuireInlineSourceAnchor[]
): readonly QuireInlineSourceCapabilitySidecar[] {
  return filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds(
    sidecars,
    anchors.map((anchor) => anchor.id)
  );
}

/**
 * Keeps View sidecars owned by an explicit set of logical source identities.
 *
 * Canonical logical anchors use their own `id`, while page occurrences retain
 * that identity as `sourceAnchorId`. Callers must select the appropriate field
 * instead of treating visual occurrence ids as logical source ids.
 *
 * @param sidecars - Source capability products before projection.
 * @param sourceAnchorIds - Logical source identities retained by the projection.
 * @returns Sidecars owned by the retained logical sources.
 */
export function filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds(
  sidecars: readonly QuireInlineSourceCapabilitySidecar[],
  sourceAnchorIds: readonly string[]
): readonly QuireInlineSourceCapabilitySidecar[] {
  const retainedSourceAnchorIds = new Set(sourceAnchorIds);
  return sidecars.filter((sidecar) =>
    retainedSourceAnchorIds.has(sidecar.sourceAnchorId)
  );
}

/**
 * Projects logical anchors and their View sidecars through one document range.
 *
 * @param box - Layout box carrying separate source products.
 * @param range - Document range retained by the projected box.
 * @returns Source product fields for the projected layout box.
 */
export function sliceQuireInlineSourceProductsToRange(
  box: QuireLayoutBox,
  range: QuireDocumentRange
): Pick<QuireLayoutBox, "sourceAnchors" | "sourceCapabilities"> {
  if (box.sourceAnchors === undefined) {
    if ((box.sourceCapabilities?.length ?? 0) > 0) {
      throw new RangeError("Inline source capabilities require canonical source anchors.");
    }
    return {};
  }

  const sourceAnchors = sliceQuireInlineSourceAnchorsToRange(
    box.sourceAnchors,
    range
  );
  return {
    sourceAnchors,
    ...(box.sourceCapabilities === undefined
      ? {}
      : {
          sourceCapabilities: sliceQuireInlineSourceCapabilitySidecarsToAnchors(
            box.sourceCapabilities,
            sourceAnchors
          )
        })
  };
}
