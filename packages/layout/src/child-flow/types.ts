import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutCoordinateSpaceKind } from "../identity";
import type { QuireTextFragment } from "../text";

/** Nested source-flow kinds understood by the consumer-neutral layout layer. */
export type QuireChildFlowRootKind =
  | "table-cell"
  | "code-block"
  | "quote-block"
  | "protected-region"
  | "extension-container";

/** Writing modes supported by recursive child flow. */
export type QuireChildFlowWritingMode = "horizontal-tb";

/** Stable source-flow band in root-local coordinates. */
export interface QuireChildFlowSourceBand {
  /** Inclusive top coordinate in source-flow space. */
  readonly top: number;
  /** Exclusive bottom coordinate in source-flow space. */
  readonly bottom: number;
}

/** Parent placement of one recursive child-flow root. */
export interface QuireChildFlowPlacement {
  /** Stable parent geometry id. */
  readonly parentId: string;
  /** Parent-space frame occupied by the root. */
  readonly rect: QuireRect;
  /** Parent-space frame available to child content. */
  readonly contentRect: QuireRect;
  /** Optional parent-space clip for content and interaction projection. */
  readonly clipRect?: QuireRect | undefined;
}

/** Consumer-neutral root that owns one recursive source flow. */
export interface QuireChildFlowRoot {
  /** Stable root identity reused across visual results. */
  readonly id: string;
  /** Root kind used by generic fragmentation policy. */
  readonly kind: QuireChildFlowRootKind;
  /** Source document range represented by the root. */
  readonly range: QuireDocumentRange;
  /** Parent placement of the root. */
  readonly placement: QuireChildFlowPlacement;
  /** Root-local measured content frame. */
  readonly localRect: QuireRect;
  /** Writing mode used by this root. */
  readonly writingMode: QuireChildFlowWritingMode;
  /** Dependency signature that validates geometry reuse. */
  readonly dependencySignature: string;
  /** Layout-domain metadata interpreted only by the owning layout adapter. */
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

/** Translation from root-local coordinates into one result coordinate space. */
export interface QuireChildFlowTransform {
  /** Horizontal translation. */
  readonly x: number;
  /** Vertical translation. */
  readonly y: number;
}

/** One measured source item supplied to recursive child-flow layout. */
export interface QuireChildFlowItem {
  /** Stable item identity within the source flow. */
  readonly id: string;
  /** Stable source identity represented by this item. */
  readonly sourceId: string;
  /** Source document range represented by this item. */
  readonly range: QuireDocumentRange;
  /** Measured rectangle in root-local source-flow coordinates. */
  readonly localRect: QuireRect;
  /** Optional text geometry in root-local source-flow coordinates. */
  readonly textFragments?: readonly QuireTextFragment[] | undefined;
}

/** One visual track available to recursive child-flow layout. */
export interface QuireChildFlowTrack {
  /** Stable track identity within the parent result. */
  readonly id: string;
  /** Track rectangle in its declared coordinate space. */
  readonly rect: QuireRect;
  /** Coordinate space that owns the track rectangle. */
  readonly coordinateSpace: QuireLayoutCoordinateSpaceKind;
  /** Optional root placement that replaces the source root placement. */
  readonly rootPlacement?: QuireChildFlowPlacement | undefined;
  /** Optional interaction clip distinct from the content frame. */
  readonly interactionClip?: QuireRect | undefined;
  /** Optional page index that owns this visual track. */
  readonly pageIndex?: number | undefined;
  /** Optional parent fragment identity recorded on continuation. */
  readonly parentFragmentId?: string | undefined;
  /** Layout-adapter continuation state retained without generic interpretation. */
  readonly continuationState?: Readonly<Record<string, unknown>> | undefined;
}

/** One child fragment accepted into a recursive child-flow result. */
export interface QuireChildFlowFragment {
  /** Stable fragment identity within the result. */
  readonly id: string;
  /** Stable source identity represented by the fragment. */
  readonly sourceId: string;
  /** Source document range represented by the fragment. */
  readonly range: QuireDocumentRange;
  /** Fragment rectangle in result coordinates. */
  readonly rect: QuireRect;
  /** Fragment rectangle in root-local source-flow coordinates. */
  readonly localRect: QuireRect;
  /** Optional result-space clip for this fragment. */
  readonly clipRect?: QuireRect | undefined;
  /** Optional text geometry accepted by this fragment. */
  readonly textFragments?: readonly QuireTextFragment[] | undefined;
}

/** State needed to continue one recursive child-flow root. */
export interface QuireChildFlowContinuation {
  /** Root identity being continued. */
  readonly rootId: string;
  /** Source document range still represented by the continuation. */
  readonly range: QuireDocumentRange;
  /** Next source-flow coordinate to resume from. */
  readonly nextSourceFlowY?: number | undefined;
  /** Source-flow band accepted by the result that produced this continuation. */
  readonly previousAcceptedBand?: QuireChildFlowSourceBand | undefined;
  /** Source-flow band still pending after the previous result. */
  readonly remainingSourceFlowBand?: QuireChildFlowSourceBand | undefined;
  /** Adapter-owned child cursor for child-driven continuation. */
  readonly childCursor?: string | undefined;
  /** Page index that produced the previous result. */
  readonly pageIndex?: number | undefined;
  /** Parent fragment identity that produced the previous result. */
  readonly parentFragmentId?: string | undefined;
  /** Previous recursive child-flow result identity. */
  readonly previousResultId: string;
  /** Pending repeated layout chrome state. */
  readonly pendingChromeState?: Readonly<Record<string, unknown>> | undefined;
  /** Layout-adapter continuation state retained without generic interpretation. */
  readonly adapterState?: Readonly<Record<string, unknown>> | undefined;
  /** Dependency signature that validates continuation reuse. */
  readonly dependencySignature: string;
}

/** Consumer-neutral result of placing child geometry into one visual track. */
export interface QuireChildFlowResult {
  /** Stable identity for this concrete visual result. */
  readonly id: string;
  /** Stable visual track identity consumed by this result. */
  readonly trackId: string;
  /** Root geometry represented by this result. */
  readonly root: QuireChildFlowRoot;
  /** Source-flow band accepted by this result. */
  readonly acceptedBand: QuireChildFlowSourceBand;
  /** Child fragments accepted into this result. */
  readonly fragments: readonly QuireChildFlowFragment[];
  /** Translation from root-local coordinates into result coordinates. */
  readonly localToResult: QuireChildFlowTransform;
  /** Coordinate space that owns result geometry. */
  readonly coordinateSpace: QuireLayoutCoordinateSpaceKind;
  /** Result-space content clip. */
  readonly contentClip: QuireRect;
  /** Result-space interaction clip. */
  readonly interactionClip: QuireRect;
  /** Continuation state, or null when this result is terminal. */
  readonly continuation: QuireChildFlowContinuation | null;
  /** Dependency signature that validates geometry reuse. */
  readonly dependencySignature: string;
  /** Optional dependency checkpoints emitted with the result. */
  readonly dependencyCheckpoints?: Readonly<Record<string, unknown>> | undefined;
}

/** Options for placing measured source items through visual tracks. */
export interface LayoutQuireChildFlowOptions {
  /** Root that owns the source flow. */
  readonly root: QuireChildFlowRoot;
  /** Measured source items in source order. */
  readonly items: readonly QuireChildFlowItem[];
  /** Visual tracks consumed in declared order. */
  readonly tracks: readonly QuireChildFlowTrack[];
  /** Source-flow band available for this layout attempt. */
  readonly sourceBand: QuireChildFlowSourceBand;
}

/** Aggregate progress returned after laying out recursive child flow. */
export interface QuireChildFlowLayout {
  /** Canonical result produced for each consumed visual track. */
  readonly results: readonly QuireChildFlowResult[];
  /** Next source-flow coordinate to continue from. */
  readonly nextSourceFlowY: number;
  /** Whether the requested source-flow band was fully consumed. */
  readonly complete: boolean;
}

/** Options for creating a canonical recursive child-flow result. */
export type CreateQuireChildFlowResultOptions = QuireChildFlowResult;

/** Options for creating a y-driven recursive child-flow continuation. */
export interface CreateQuireChildFlowContinuationOptions {
  /** Root that owns the source flow being continued. */
  readonly root: QuireChildFlowRoot;
  /** Source-flow band accepted by the result that was just produced. */
  readonly acceptedBand: QuireChildFlowSourceBand;
  /** Result identity that produced this continuation. */
  readonly previousResultId: string;
  /** Optional source-flow bottom limit for the root. */
  readonly sourceFlowBottom?: number | undefined;
  /** Optional page index that produced the previous result. */
  readonly pageIndex?: number | undefined;
  /** Optional parent fragment identity that produced the previous result. */
  readonly parentFragmentId?: string | undefined;
  /** Optional adapter-owned continuation state. */
  readonly adapterState?: Readonly<Record<string, unknown>> | undefined;
}
