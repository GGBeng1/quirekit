import type {
  QuireLayoutOwnerFacts,
  QuireLayoutQueryProductOwner
} from "@quirekit/layout/products";
import type { QuireChildFlowResult } from "@quirekit/layout/child-flow";
import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutExportFallback,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type { QuireHitTarget, QuireLayoutBox } from "../types";

import type { QuireRetainedRegionProducts } from "../../region-products";

/** Selection rectangle exposed by a sub-layout query result. */
export interface QuireSubLayoutSelectionRect {
  /** Accepted text fragment that owns this line rectangle and its caret stops. */
  readonly textFragmentId: string;
  /** Source document range covered by the selection rectangle. */
  readonly range: QuireDocumentRange;
  /** Selection rectangle in parent coordinates. */
  readonly rect: QuireRect;
  /** Optional retained owner and coordinate-space facts for this rectangle. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/** Caret stop exposed by a sub-layout query result. */
export interface QuireSubLayoutCaretStop {
  /** Accepted text fragment whose line rectangle owns this caret stop. */
  readonly textFragmentId: string;
  /** Document position represented by the caret stop. */
  readonly position: QuireDocumentPosition;
  /** Caret rectangle in parent coordinates. */
  readonly rect: QuireRect;
  /** Optional shared visual-line baseline in parent coordinates. */
  readonly lineBaseline?: number | undefined;
  /** Optional child fragment id that owns this caret stop. */
  readonly fragmentId?: string | undefined;
  /** Optional retained owner and coordinate-space facts for this caret stop. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/** Input anchor exposed for caret, selection, or composition proxy placement. */
export interface QuireSubLayoutInputAnchor {
  /** Document position represented by the input anchor. */
  readonly position: QuireDocumentPosition;
  /** Anchor rectangle in parent coordinates. */
  readonly rect: QuireRect;
  /** Anchor role consumed by mounted input placement. */
  readonly role: "caret" | "selection" | "composition";
  /** Optional retained owner and coordinate-space facts for this input anchor. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}

/** Query products derived from the same accepted child fragments. */
export interface QuireSubLayoutQueryProducts {
  /** Selection rectangles in parent coordinates. */
  readonly selectionRects: readonly QuireSubLayoutSelectionRect[];
  /** Caret stops in parent coordinates. */
  readonly caretStops: readonly QuireSubLayoutCaretStop[];
  /** Hit targets in parent coordinates. */
  readonly hitTargets: readonly QuireHitTarget[];
  /** Input anchors in parent coordinates. */
  readonly inputAnchors: readonly QuireSubLayoutInputAnchor[];
}

/** Reference to retained display chunks produced for a sub-layout result. */
export interface QuireSubLayoutDisplayChunkReference {
  /** Display chunk scope. */
  readonly kind: "page-local" | "sub-layout-local";
  /** Stable display chunk key. */
  readonly key: string;
  /** Parent/document-space rectangle owned by this display chunk. */
  readonly rect: QuireRect;
  /** Parent/document-space content clip for this display chunk. */
  readonly contentClip: QuireRect;
  /** Parent/document-space interaction clip associated with this display chunk. */
  readonly interactionClip: QuireRect;
  /** Retained owner facts shared with query products from the same sub-layout result. */
  readonly queryOwner: QuireLayoutQueryProductOwner;
  /** Dependency signature for the retained sub-layout result that owns this chunk. */
  readonly dependencySignature: string;
  /** Exact projected source layout boxes whose paint belongs to this chunk. */
  readonly sourceBoxIds: readonly string[];
  /** Optional display command id that roots this chunk's paint subtree. */
  readonly paintRootCommandId?: string | undefined;
  /** Optional page index for page-local chunks. */
  readonly pageIndex?: number | undefined;
}

/** Missing ownership fact reported by a sub-layout View projection. */
export type QuireSubLayoutOwnershipGapKind =
  | "root"
  | "region"
  | "source"
  | "capabilities"
  | "visual-instance";

/** Explicit retained ownership state for one recursive child-flow result. */
export type QuireSubLayoutOwnership =
  | {
      /** Result does not claim retained editor ownership. */
      readonly status: "unclaimed";
    }
  | {
      /** Result has complete retained editor ownership. */
      readonly status: "resolved";
      /** Retained root represented by this result. */
      readonly root: QuireLayoutRoot;
      /** Exact region, source, and capability facts represented by this result. */
      readonly owner: QuireLayoutOwnerFacts;
      /** Canonical retained products owned by this recursive root. */
      readonly regionProducts?: QuireRetainedRegionProducts | undefined;
      /** Optional export fallback declarations represented by this root. */
      readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
    }
  | {
      /** Result expected retained ownership but required facts are missing. */
      readonly status: "gap";
      /** Missing facts that prevent canonical retained ownership. */
      readonly missing: readonly QuireSubLayoutOwnershipGapKind[];
    };

/** View-owned products attached to one consumer-neutral child-flow root. */
export interface QuireSubLayoutRootViewProducts {
  /** Explicit retained ownership state. */
  readonly ownership: QuireSubLayoutOwnership;
  /** Optional measured source box retained for later visual projection. */
  readonly sourceBox?: QuireLayoutBox | undefined;
}

/** Source-box provenance attached to one canonical child-flow fragment. */
export interface QuireSubLayoutFragmentSource {
  /** Canonical child-flow fragment identity. */
  readonly fragmentId: string;
  /** Measured source box represented by that fragment. */
  readonly sourceBox: QuireLayoutBox;
}

/** View-owned products keyed to one canonical child-flow result. */
export interface QuireSubLayoutViewProducts {
  /** Canonical result identity that owns these products. */
  readonly resultId: string;
  /** View products attached to the canonical root. */
  readonly root: QuireSubLayoutRootViewProducts;
  /** Source boxes keyed by canonical child-fragment identity. */
  readonly fragmentSources: readonly QuireSubLayoutFragmentSource[];
  /** Selection, caret, hit-test, and input-anchor query products. */
  readonly queryProducts: QuireSubLayoutQueryProducts;
  /** Retained display chunk references derived from this result. */
  readonly displayChunks: readonly QuireSubLayoutDisplayChunkReference[];
}

/** View projection attached to one consumer-neutral recursive child-flow result. */
export interface QuireSubLayoutProjection {
  /** Canonical geometry, clipping, continuation, and result identity. */
  readonly geometry: QuireChildFlowResult;
  /** View-owned query, retained ownership, source, and display products. */
  readonly view: QuireSubLayoutViewProducts;
}

/** Options used to attach View products to canonical child-flow geometry. */
export interface CreateQuireSubLayoutProjectionOptions {
  /** Canonical child-flow geometry result. */
  readonly geometry: QuireChildFlowResult;
  /** View products attached to the canonical root. */
  readonly root: QuireSubLayoutRootViewProducts;
  /** Optional source boxes keyed by canonical child-fragment identity. */
  readonly fragmentSources?: readonly QuireSubLayoutFragmentSource[] | undefined;
  /** Query products derived from the same canonical geometry. */
  readonly queryProducts: QuireSubLayoutQueryProducts;
  /** Optional explicit retained display chunks. */
  readonly displayChunks?: readonly QuireSubLayoutDisplayChunkReference[] | undefined;
}

/** Retained sub-layout fragment attached to a parent layout box. */
export interface QuireLayoutBoxSubLayoutFragment {
  /** Sub-layout result that owns query products and child fragment provenance. */
  readonly subLayout: QuireSubLayoutProjection;
}
