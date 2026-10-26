export { collectQuireInlineSourceCapabilitySidecars } from "./collect";
export { createQuireInlineSourceCapabilityRegistry } from "@quirekit/layout/inline";
export { createQuireInlineSourceCapabilitySignature } from "@quirekit/layout/inline";
export {
  filterQuireInlineSourceCapabilitySidecarsBySourceAnchorIds,
  sliceQuireInlineSourceCapabilitySidecarsToAnchors,
  sliceQuireInlineSourceProductsToRange
} from "./range";
export { createQuireDrawingObjectSourceCapabilityResolver } from "./drawing";
export type {
  QuireInlineSourceCapabilityGap,
  QuireInlineSourceInteractionTransform,
  QuireInlineSourceCapabilityRegistry,
  QuireInlineSourceCapabilityResolver,
  QuireInlineSourceCapabilityResolverInput,
  QuireInlineSourceCapabilityResolverResult,
  QuireInlineSourceCapabilitySidecar,
  QuireGapInlineSourceCapabilitySidecar,
  QuireInlineSourceOccurrenceText,
  QuireInlineSourcePresentation,
  QuireInlineSourceTextStyle,
  QuireInlineSourceVisualOverflow,
  QuireResolvedInlineSourceCapabilitySidecar
} from "./types";
