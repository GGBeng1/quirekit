import type { QuireLayoutSnapshot } from "@quirekit/view-engine";

/** Coordinate spaces accepted by the headless anchor contract. */
export type EditorUIAnchorCoordinateSpace = "document" | "client";

/** Renderer-neutral rectangle used by anchor products and mounted projections. */
export interface EditorUIAnchorRect {
  /** Horizontal origin in the owning coordinate space. */
  readonly x: number;
  /** Vertical origin in the owning coordinate space. */
  readonly y: number;
  /** Rectangle width. Zero is valid for caret and boundary anchors. */
  readonly width: number;
  /** Rectangle height. Zero is valid for line and insertion handles. */
  readonly height: number;
}

/** Browser client rectangle that anchors one mounted surface projection. */
export interface EditorUIAnchorSurfaceClientRect {
  /** Client-space left edge. */
  readonly left: number;
  /** Client-space top edge. */
  readonly top: number;
  /** Client-space width. */
  readonly width: number;
  /** Client-space height. */
  readonly height: number;
}

/** Optional retained occurrence used to disambiguate repeated visual instances. */
export interface EditorUIAnchorOccurrence {
  /** Exact retained target id, when the caller already owns one. */
  readonly targetId?: string | undefined;
  /** Exact repeated visual-instance id, when the source renders more than once. */
  readonly visualInstanceId?: string | undefined;
}

/** Fields shared by every version-bound anchor request. */
export interface EditorUIAnchorRequestBase {
  /** Snapshot version that produced the UI controller state. */
  readonly expectedSnapshotVersion: number;
}

/** Request for one collapsed caret rectangle. */
export interface EditorUICaretAnchorRequest extends EditorUIAnchorRequestBase {
  /** Caret request discriminator. */
  readonly kind: "caret";
  /** Explicit document position; the resolver never reads the current caret. */
  readonly position: number;
  /** Optional retained occurrence for repeated layout instances. */
  readonly occurrence?: EditorUIAnchorOccurrence | undefined;
}

/** Request for the visible rectangles of one explicit text range. */
export interface EditorUITextAnchorRequest extends EditorUIAnchorRequestBase {
  /** Text-range request discriminator. */
  readonly kind: "text";
  /** Half-open document range represented by the UI surface. */
  readonly range: { readonly from: number; readonly to: number };
  /** Optional retained occurrence for repeated layout instances. */
  readonly occurrence?: EditorUIAnchorOccurrence | undefined;
}

/** Request for one semantic node target retained by the interaction snapshot. */
export interface EditorUINodeAnchorRequest extends EditorUIAnchorRequestBase {
  /** Node request discriminator. */
  readonly kind: "node";
  /** Stable semantic node id carried by a retained interaction hit. */
  readonly nodeId: string;
  /** Optional retained occurrence for repeated node instances. */
  readonly occurrence?: EditorUIAnchorOccurrence | undefined;
}

/** Request for one retained drawing or object body. */
export interface EditorUIObjectAnchorRequest extends EditorUIAnchorRequestBase {
  /** Object request discriminator. */
  readonly kind: "object";
  /** Stable object id carried by the retained object interaction hit. */
  readonly objectId: string;
  /** Optional retained occurrence for repeated object instances. */
  readonly occurrence?: EditorUIAnchorOccurrence | undefined;
}

/** Table-cell target addressed by semantic cell identity. */
export interface EditorUITableCellAnchorTarget {
  /** Table-cell target discriminator. */
  readonly kind: "cell";
  /** Stable semantic cell id. */
  readonly cellId: string;
}

/** Table-row target addressed by source row index. */
export interface EditorUITableRowAnchorTarget {
  /** Table-row target discriminator. */
  readonly kind: "row";
  /** Zero-based source row index. */
  readonly index: number;
}

/** Table-column target addressed by grid column index. */
export interface EditorUITableColumnAnchorTarget {
  /** Table-column target discriminator. */
  readonly kind: "column";
  /** Zero-based grid column index. */
  readonly index: number;
}

/** Whole-table geometry target. */
export interface EditorUITableBodyAnchorTarget {
  /** Whole-table target discriminator. */
  readonly kind: "table";
}

/** Table-local floating toolbar target. */
export interface EditorUITableMenuAnchorTarget {
  /** Table-menu target discriminator. */
  readonly kind: "menu";
}

/** Semantic Table target supported by the foundation contract. */
export type EditorUITableAnchorTarget =
  | EditorUITableCellAnchorTarget
  | EditorUITableRowAnchorTarget
  | EditorUITableColumnAnchorTarget
  | EditorUITableBodyAnchorTarget
  | EditorUITableMenuAnchorTarget;

/** Request for retained Table cell, row, column, body, or menu geometry. */
export interface EditorUITableAnchorRequest extends EditorUIAnchorRequestBase {
  /** Table request discriminator. */
  readonly kind: "table";
  /** Stable semantic table id retained by layout. */
  readonly tableId: string;
  /** Explicit document position immediately before the table. */
  readonly tablePos: number;
  /** Explicit position selecting the intended visual fragment. */
  readonly activePosition: number;
  /** Table part whose geometry should anchor the UI. */
  readonly target: EditorUITableAnchorTarget;
  /** Optional retained occurrence for repeated cell targets. */
  readonly occurrence?: EditorUIAnchorOccurrence | undefined;
}

/** Request for one semantic widget target retained by the snapshot. */
export interface EditorUIWidgetAnchorRequest extends EditorUIAnchorRequestBase {
  /** Widget request discriminator. */
  readonly kind: "widget";
  /** Stable widget identity carried by a retained interaction hit. */
  readonly widgetId: string;
  /** Optional semantic widget part. */
  readonly part?: string | undefined;
  /** Optional retained occurrence for repeated widget instances. */
  readonly occurrence?: EditorUIAnchorOccurrence | undefined;
}

/** Request for an explicit virtual rectangle in document coordinates. */
export interface EditorUIVirtualAnchorRequest extends EditorUIAnchorRequestBase {
  /** Virtual request discriminator. */
  readonly kind: "virtual";
  /** Explicit document-space rectangle; DOM discovery is never attempted. */
  readonly rect: EditorUIAnchorRect;
}

/** Typed request union accepted by the anchor geometry resolver. */
export type EditorUIAnchorRequest =
  | EditorUICaretAnchorRequest
  | EditorUITextAnchorRequest
  | EditorUINodeAnchorRequest
  | EditorUIObjectAnchorRequest
  | EditorUITableAnchorRequest
  | EditorUIWidgetAnchorRequest
  | EditorUIVirtualAnchorRequest;

/** Stable reason returned when authoritative geometry cannot be produced. */
export type EditorUIAnchorUnsupportedReason =
  | "expected-snapshot-version-invalid"
  | "snapshot-version-unavailable"
  | "snapshot-version-invalid"
  | "occurrence-target-unavailable"
  | "caret-geometry-unavailable"
  | "text-geometry-unavailable"
  | "node-target-unavailable"
  | "node-target-ambiguous"
  | "object-target-unavailable"
  | "object-target-ambiguous"
  | "table-target-unavailable"
  | "table-target-ambiguous"
  | "widget-target-unavailable"
  | "widget-target-ambiguous"
  | "virtual-rect-invalid"
  | "resolved-geometry-invalid"
  | "surface-projection-invalid";

/** Common fields carried by every ready anchor geometry product. */
export interface EditorUIReadyAnchorBase<
  Space extends EditorUIAnchorCoordinateSpace
> {
  /** Ready-result discriminator. */
  readonly status: "ready";
  /** Coordinate space that owns every rectangle. */
  readonly coordinateSpace: Space;
  /** Retained snapshot version that produced the rectangles. */
  readonly snapshotVersion: number;
  /** Complete visible rectangles in deterministic order. */
  readonly rects: readonly EditorUIAnchorRect[];
  /** Bounding rectangle used as the default placement reference. */
  readonly referenceRect: EditorUIAnchorRect;
  /** Retained hit-target ids that supplied semantic geometry. */
  readonly sourceTargetIds: readonly string[];
}

/** Ready caret geometry. */
export interface EditorUICaretAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Caret product discriminator. */
  readonly kind: "caret";
  /** Explicit document position represented by the caret. */
  readonly position: number;
}

/** Ready text-range geometry. */
export interface EditorUITextAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Text product discriminator. */
  readonly kind: "text";
  /** Half-open source range represented by the rectangles. */
  readonly range: { readonly from: number; readonly to: number };
}

/** Ready semantic node geometry. */
export interface EditorUINodeAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Node product discriminator. */
  readonly kind: "node";
  /** Stable semantic node id. */
  readonly nodeId: string;
}

/** Ready retained drawing or object geometry. */
export interface EditorUIObjectAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Object product discriminator. */
  readonly kind: "object";
  /** Stable object id. */
  readonly objectId: string;
}

/** Ready Table geometry. */
export interface EditorUITableAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Table product discriminator. */
  readonly kind: "table";
  /** Stable semantic table id. */
  readonly tableId: string;
  /** Exact Table part represented by the geometry. */
  readonly target: EditorUITableAnchorTarget;
}

/** Ready semantic widget geometry. */
export interface EditorUIWidgetAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Widget product discriminator. */
  readonly kind: "widget";
  /** Stable semantic widget id. */
  readonly widgetId: string;
  /** Optional widget part represented by the geometry. */
  readonly part?: string | undefined;
}

/** Ready explicit virtual geometry. */
export interface EditorUIVirtualAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> extends EditorUIReadyAnchorBase<Space> {
  /** Virtual product discriminator. */
  readonly kind: "virtual";
}

/** Typed ready-product union in one known coordinate space. */
export type EditorUIReadyAnchorGeometry<
  Space extends EditorUIAnchorCoordinateSpace
> =
  | EditorUICaretAnchorGeometry<Space>
  | EditorUITextAnchorGeometry<Space>
  | EditorUINodeAnchorGeometry<Space>
  | EditorUIObjectAnchorGeometry<Space>
  | EditorUITableAnchorGeometry<Space>
  | EditorUIWidgetAnchorGeometry<Space>
  | EditorUIVirtualAnchorGeometry<Space>;

/** Result returned when controller geometry belongs to an older snapshot. */
export interface EditorUIStaleAnchorGeometry {
  /** Stale-result discriminator. */
  readonly status: "stale";
  /** Request kind whose version no longer matches. */
  readonly kind: EditorUIAnchorRequest["kind"];
  /** Version requested by the controller snapshot. */
  readonly expectedSnapshotVersion: number;
  /** Current authoritative retained snapshot version. */
  readonly snapshotVersion: number;
}

/** Result returned when an anchor capability cannot produce authoritative geometry. */
export interface EditorUIUnsupportedAnchorGeometry {
  /** Unsupported-result discriminator. */
  readonly status: "unsupported";
  /** Request kind whose geometry is unavailable. */
  readonly kind: EditorUIAnchorRequest["kind"];
  /** Current retained snapshot version, when one exists. */
  readonly snapshotVersion?: number | undefined;
  /** Stable machine-readable reason; callers must not substitute guessed geometry. */
  readonly reason: EditorUIAnchorUnsupportedReason;
}

/** Document-space outcome of resolving one typed anchor request. */
export type EditorUIAnchorGeometryResolution =
  | EditorUIReadyAnchorGeometry<"document">
  | EditorUIStaleAnchorGeometry
  | EditorUIUnsupportedAnchorGeometry;

/** Client-space outcome exposed by a mounted Canvas or SVG view. */
export type EditorUIClientAnchorResolution =
  | EditorUIReadyAnchorGeometry<"client">
  | EditorUIStaleAnchorGeometry
  | EditorUIUnsupportedAnchorGeometry;

/** Inputs used to resolve document-space anchor geometry. */
export interface ResolveEditorUIAnchorGeometryOptions {
  /** Current retained render-time interaction snapshot. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Explicit typed anchor request. */
  readonly request: EditorUIAnchorRequest;
}

/** Inputs used to project a resolved anchor onto a mounted client surface. */
export interface ProjectEditorUIAnchorGeometryOptions {
  /** Document-space geometry resolution to project. */
  readonly geometry: EditorUIAnchorGeometryResolution;
  /** Browser client rectangle of the mounted coordinate surface. */
  readonly surfaceClientRect: EditorUIAnchorSurfaceClientRect;
  /** Document-space bounds represented by the mounted coordinate surface. */
  readonly surfaceBounds: EditorUIAnchorRect | undefined;
}
