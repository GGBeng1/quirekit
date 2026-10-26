import type * as Layout from "@quirekit/layout/inline";
import type { QuireViewLayerActivation } from "../../../../view-graph";

export type {
  QuireInlineSourceCapabilityGap,
  QuireInlineSourceInteractionTransform,
  QuireInlineSourceCapabilityResolverInput,
  QuireGapInlineSourceCapabilitySidecar,
  QuireInlineSourceOccurrenceText,
  QuireInlineSourceTextStyle,
  QuireInlineSourceVisualOverflow
} from "@quirekit/layout/inline";

/** Source contract instantiated with Engine-owned selected-owner activation. */
export type QuireInlineSourcePresentation = Layout.QuireInlineSourcePresentation<QuireViewLayerActivation>;
/** Source contract instantiated with Engine-owned selected-owner activation. */
export type QuireResolvedInlineSourceCapabilitySidecar = Layout.QuireResolvedInlineSourceCapabilitySidecar<QuireViewLayerActivation>;
/** Source contract instantiated with Engine-owned selected-owner activation. */
export type QuireInlineSourceCapabilitySidecar = Layout.QuireInlineSourceCapabilitySidecar<QuireViewLayerActivation>;
/** Source contract instantiated with Engine-owned selected-owner activation. */
export type QuireInlineSourceCapabilityResolverResult = Layout.QuireInlineSourceCapabilityResolverResult<QuireViewLayerActivation>;
/** Source contract instantiated with Engine-owned selected-owner activation. */
export type QuireInlineSourceCapabilityResolver = Layout.QuireInlineSourceCapabilityResolver<QuireViewLayerActivation>;
/** Source contract instantiated with Engine-owned selected-owner activation. */
export type QuireInlineSourceCapabilityRegistry = Layout.QuireInlineSourceCapabilityRegistry<QuireViewLayerActivation>;
