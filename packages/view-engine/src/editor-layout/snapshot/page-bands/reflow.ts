import type { QuireInlineSourceCapabilitySidecar } from "../../../layout/engine/inline/source-capability";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../../layout/engine/types";
import {
  translateQuireLayoutBox,
  translateQuireTextFragments
} from "../../../layout/engine/pagination/projection/translate";

/** Result of reflowing one source-layout subtree for a page occurrence. */
interface QuireWordHeaderFooterOccurrenceReflowResult {
  /** Reflowed box in the same coordinate space as its source. */
  readonly box: QuireLayoutBox;
  /** Block-size delta introduced by evaluated inline fields. */
  readonly blockSizeDelta: number;
}

/**
 * Reflows evaluated page fields through their owning header/footer paragraphs.
 *
 * @param layout - Canonical story layout measured from cached field values.
 * @param capabilities - Occurrence capabilities carrying evaluated field extents.
 * @returns Story layout whose wrapping and alignment use the actual page values.
 */
export function reflowQuirePageBandOccurrence(
  layout: QuireLayoutContainer,
  capabilities: readonly QuireInlineSourceCapabilitySidecar[]
): QuireLayoutContainer {
  const byAnchorId = new Map(
    capabilities.map((capability) => [capability.sourceAnchorId, capability])
  );
  const replacements = new Map(
    capabilities.flatMap((capability) =>
      capability.status === "resolved"
      && capability.presentation.occurrenceText !== undefined
        ? [[capability.sourceAnchorId, capability.placement.extent] as const]
        : []
    )
  );

  return reflowLayoutBox(layout, byAnchorId, replacements).box as QuireLayoutContainer;
}

/**
 * Reflows one box and shifts later siblings when its block extent changes.
 *
 * @param box - Source layout box to reflow.
 * @param capabilities - Occurrence sidecars keyed by source anchor id.
 * @param replacements - Evaluated replacement extents keyed by source anchor id.
 * @returns Reflowed box plus its block-size delta.
 */
function reflowLayoutBox(
  box: QuireLayoutBox,
  capabilities: ReadonlyMap<string, QuireInlineSourceCapabilitySidecar>,
  replacements: ReadonlyMap<string, { readonly inlineSize: number; readonly blockSize: number }>
): QuireWordHeaderFooterOccurrenceReflowResult {
  const direct = reflowDirectText(box, replacements);
  const sourceCapabilities = box.sourceCapabilities?.map((capability) =>
    capabilities.get(capability.sourceAnchorId) ?? capability
  );
  const base = {
    ...box,
    ...direct.boxFields,
    ...(sourceCapabilities === undefined ? {} : { sourceCapabilities })
  };

  if (!("children" in box) || !Array.isArray(box.children)) {
    return { box: base, blockSizeDelta: direct.blockSizeDelta };
  }

  let cumulativeDelta = 0;
  const children = box.children.map((child) => {
    const result = reflowLayoutBox(child, capabilities, replacements);
    const shifted = cumulativeDelta === 0
      ? result.box
      : translateQuireLayoutBox(result.box, { dx: 0, dy: cumulativeDelta });
    cumulativeDelta += result.blockSizeDelta;
    return shifted;
  });
  const height = Math.max(0, base.rect.height + cumulativeDelta);
  const blockSizeDelta = height - box.rect.height;

  return {
    box: {
      ...base,
      rect: { ...base.rect, height },
      ...(base.inlineLayoutRect === undefined
        ? {}
        : { inlineLayoutRect: { ...base.inlineLayoutRect, height } }),
      children
    } as QuireLayoutContainer,
    blockSizeDelta
  };
}

/**
 * Reshapes direct text fragments when this box owns an evaluated field.
 *
 * @param box - Candidate textblock layout box.
 * @param replacements - Evaluated replacement extents keyed by source anchor id.
 * @returns Replacement fields plus the resulting block-size delta.
 */
function reflowDirectText(
  box: QuireLayoutBox,
  replacements: ReadonlyMap<string, { readonly inlineSize: number; readonly blockSize: number }>
): {
  readonly boxFields: Partial<QuireLayoutBox>;
  readonly blockSizeDelta: number;
} {
  const reflow = box.textFlowReflow;
  const participates = box.textRuns?.some((run) =>
    run.replacement !== undefined
    && replacements.has(run.replacement.sourceAnchorId)
  ) === true;
  if (reflow === undefined || !participates) {
    return { boxFields: {}, blockSizeDelta: 0 };
  }

  const result = reflow.reflowInlineReplacements(replacements);
  const textFragments = translateQuireTextFragments(result.textFragments, {
    dx: box.rect.x,
    dy: box.rect.y
  });
  const oldContentHeight = resolveTextContentHeight(
    box.textFragments ?? [],
    box.rect.y,
    reflow.lineHeight
  );
  const newContentHeight = resolveTextContentHeight(
    result.textFragments,
    0,
    reflow.lineHeight
  );
  const trailingExtent = Math.max(0, box.rect.height - oldContentHeight);
  const height = newContentHeight + trailingExtent;

  return {
    boxFields: {
      rect: { ...box.rect, height },
      ...(box.inlineLayoutRect === undefined
        ? {}
        : { inlineLayoutRect: { ...box.inlineLayoutRect, height } }),
      textRuns: result.textRuns,
      textFragments
    },
    blockSizeDelta: height - box.rect.height
  };
}

/**
 * Resolves the occupied text height relative to one textblock origin.
 *
 * @param fragments - Measured text fragments in local or placed coordinates.
 * @param originY - Textblock origin in the fragments' coordinate space.
 * @param lineHeight - Minimum paragraph strut height.
 * @returns Occupied content height before paragraph trailing spacing.
 */
function resolveTextContentHeight(
  fragments: NonNullable<QuireLayoutBox["textFragments"]>,
  originY: number,
  lineHeight: number
): number {
  return Math.max(
    lineHeight,
    ...fragments.map((fragment) => fragment.rect.y + fragment.rect.height - originY)
  );
}
