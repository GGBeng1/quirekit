import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireDecorationLanes } from "../../decorations";
import type { QuireRetainedLayoutSnapshot } from "../../editor-layout";
import type { QuireLayoutDomOverlay } from "../../layout";
import type { QuireHitTarget } from "../../layout/engine/types";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";
import type {
  QuireViewLayerRef
} from "../../view-graph";
import type {
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type { QuireSelectionGeometry } from "../types";

/** Options used to build an interaction snapshot from render-time products. */
export interface BuildQuireRenderInteractionSnapshotOptions {
  /** Layout snapshot produced by the layout authority. */
  readonly layoutSnapshot: QuireRetainedLayoutSnapshot;
  /** Selection geometry produced for the current render pass. */
  readonly selectionGeometry: QuireSelectionGeometry;
  /** Decoration lane produced for the current render pass. */
  readonly decorationLane: QuireDecorationLanes;
  /** Render-time DOM overlays that are not already carried by the layout snapshot. */
  readonly domOverlays?: readonly QuireLayoutDomOverlay[] | undefined;
}

/** Retained owner facts inherited from the base layout snapshot. */
export interface QuireInteractionSnapshotOwner {
  /** Fallback retained region for transient overlay targets. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Fallback retained capabilities for transient overlay targets. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Exact region-owned source for transient overlay targets. */
  readonly source?: QuireLayoutSourceRef | undefined;
}

/** Options used to create one retained pass-through target. */
export interface CreateQuirePassThroughLayerTargetOptions {
  /** Stable target id. */
  readonly id: string;
  /** Document range represented by the target. */
  readonly range: QuireDocumentRange;
  /** Target rectangle in document coordinates. */
  readonly rect: QuireHitTarget["rect"];
  /** Retained layer represented by the target. */
  readonly layer: QuireViewLayerRef;
  /** Fallback retained owner facts inherited from the snapshot. */
  readonly owner: QuireInteractionSnapshotOwner;
  /** Query-product owner that produced the transient target, when available. */
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
}
