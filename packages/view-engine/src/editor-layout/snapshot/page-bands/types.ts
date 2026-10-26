import type { QuireInlineSourceVisualOccurrenceGap } from "@quirekit/layout/inline";
import type { QuireInlinePlacementGap } from "../../../layout/engine/inline/placement-reference";
import type { QuireRetainedRegionProducts } from "../../../layout/region-products";
import type { QuirePaginationTextDiagnostic } from "../../../layout/engine/types";
import type { QuireLayoutAnchor, QuireLayoutContainer } from "../../../layout/engine/types";
import type {
  QuireInlineSourceCapabilitySidecar
} from "../../../layout/engine/inline/source-capability";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuirePageBand,
  QuirePageModelProfile,
  QuirePageSection
} from "../../../document-profile/types";

/** Canonical measured layout for one auxiliary story shown in a page band. */
export interface QuirePageBandStorySourceLayout {
  /** Stable persisted story id. */
  readonly storyId: string;
  /** Band the story belongs to. */
  readonly kind: QuirePageBand;
  /** Story-local measured layout with global document ranges. */
  readonly layout: QuireLayoutContainer;
  /** Logical inline source anchors collected once from persisted story intent. */
  readonly anchors: readonly QuireLayoutAnchor[];
  /** View capability sidecars paired with the logical story anchors. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
}

/** Options for resolving band-aware physical page body rectangles. */
export interface ResolveQuirePageBandPageGeometryOptions {
  /** Section owning the pages; omission uses the page model's leading section. */
  readonly section?: QuirePageSection | undefined;
  /** Shared document containing the section and story references. */
  readonly documentNode: ProseMirrorNode;
  /** Base clone-safe page geometry derived from section margins or explicit input. */
  readonly pageGeometry: QuirePageGeometry;
  /** Canonical measured story sources produced by the current layout pass. */
  readonly sources: readonly QuirePageBandStorySourceLayout[];
  /** Page semantics supplied by the document profile. */
  readonly pageModel: QuirePageModelProfile;
}

/** Complete products created while instantiating one persisted story on one page. */
export interface QuirePageBandStoryInstanceResult {
  /** Text policies whose source geometry remains authoritative. */
  readonly paginationTextDiagnostics?: readonly QuirePaginationTextDiagnostic[] | undefined;
  /** Translated and reidentified page-local story layout. */
  readonly instance: QuireLayoutContainer;
  /** Page-local inline visual occurrences compiled from story source anchors. */
  readonly anchors: readonly QuireLayoutAnchor[];
  /** Source capabilities paired with the active page-local occurrences. */
  readonly sourceCapabilities: readonly QuireInlineSourceCapabilitySidecar[];
  /** Typed failures encountered while projecting source anchors onto the page. */
  readonly occurrenceGaps: readonly QuireInlineSourceVisualOccurrenceGap[];
  /** Retained products compiled for page-local floating-object occurrences. */
  readonly regionProducts: QuireRetainedRegionProducts;
  /** Typed failures encountered while placing projected floating objects. */
  readonly placementGaps: readonly QuireInlinePlacementGap[];
}
