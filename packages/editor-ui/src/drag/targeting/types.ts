import type {
  EditorUIAnchorRect,
  EditorUIAnchorSurfaceClientRect
} from "../../anchor";
import type { NodeRangeSelection } from "../../node-range-selection";
import type { EditorUIWritingDirection } from "../../node-range-selection";
import type {
  EditorUIDragAutoScrollDecision,
  EditorUIDragPoint,
  EditorUIDragTargetResolution
} from "../types";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";

/** Block axis used to derive structural before/after placement. */
export type EditorUIBlockFlowAxis = "vertical" | "horizontal";

/** Feature-owned eligibility facts applied after retained target resolution. */
export interface EditorUIBlockDropPolicy {
  /** Whether a protected range rejects this structural move. */
  readonly protected?: boolean | undefined;
  /** Whether a feature or collaboration lock rejects this target. */
  readonly locked?: boolean | undefined;
  /** Whether source and target schemas can represent the move. */
  readonly schemaCompatible?: boolean | undefined;
  /** Whether current permission permits the structural move. */
  readonly permitted?: boolean | undefined;
  /** Additional feature editability gate; true never upgrades retained capabilities. */
  readonly targetEditable?: boolean | undefined;
}

/** Stable retained target facts passed to a feature payload factory. */
export interface EditorUIBlockDropPayloadFacts {
  /** Stable root that owns the target. */
  readonly rootId: string;
  /** Stable node identity. */
  readonly nodeId: string;
  /** Position immediately before the target node. */
  readonly position: number;
  /** Retained half-open source range represented by the target. */
  readonly range: { readonly from: number; readonly to: number };
}

/** Options used to resolve one command-neutral block drop target. */
export interface ResolveEditorUIBlockDropTargetOptions<TargetPayload> {
  /** Current retained interaction snapshot from View Engine. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Snapshot version expected by the drag session. */
  readonly expectedSnapshotVersion: number;
  /** Stable source structural selection. */
  readonly sourceSelection: NodeRangeSelection;
  /** Latest mounted client point in CSS pixels. */
  readonly clientPoint: EditorUIDragPoint;
  /** Mounted surface rectangle in browser client coordinates. */
  readonly surfaceClientRect: EditorUIAnchorSurfaceClientRect;
  /** Document-space bounds represented by the mounted surface. */
  readonly surfaceBounds: EditorUIAnchorRect;
  /** Whether the point remains inside an editor-owned content drop zone. */
  readonly insideDropZone: boolean;
  /** Block-flow axis used for before/after classification. */
  readonly blockAxis: EditorUIBlockFlowAxis;
  /** Inline writing direction used by horizontal block flow. */
  readonly writingDirection: EditorUIWritingDirection;
  /** Optional feature-owned policy facts. */
  readonly policy?: EditorUIBlockDropPolicy | undefined;
  /**
   * Creates an opaque feature target payload after every foundation gate passes.
   *
   * @param facts - Stable retained target facts.
   * @returns Opaque feature payload for a later canonical command.
   */
  readonly createPayload: (facts: EditorUIBlockDropPayloadFacts) => TargetPayload;
}

/** Physical scroll facts mapped into one logical block-drag decision. */
export interface ResolveEditorUIBlockDragAutoScrollDecisionOptions {
  /** Signed horizontal CSS-pixel delta computed by the mounted scroll authority. */
  readonly deltaX: number;
  /** Signed vertical CSS-pixel delta computed by the mounted scroll authority. */
  readonly deltaY: number;
  /** Inline writing direction used to name logical horizontal edges. */
  readonly writingDirection: EditorUIWritingDirection;
}

/** Public result alias for block target resolution. */
export type EditorUIBlockDropTargetResolution<TargetPayload> =
  EditorUIDragTargetResolution<TargetPayload>;

/** Public result alias for logical block-drag auto-scroll decisions. */
export type EditorUIBlockDragAutoScrollDecision = EditorUIDragAutoScrollDecision;
