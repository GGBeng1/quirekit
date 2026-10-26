import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";

/** Stable kind for one consumer-neutral layout root. */
export type QuireLayoutRootKind =
  | "document"
  | "body"
  | "header"
  | "footer"
  | "footnote"
  | "endnote"
  | "table-cell"
  | "drawing"
  | "text-box"
  | "drawing-text"
  | "block-container"
  | "media"
  | "embed";

/** Stable kind for one visual or semantic layout region. */
export type QuireLayoutRegionKind =
  | "body"
  | "header"
  | "footer"
  | "footnote"
  | "endnote"
  | "section"
  | "page-decoration"
  | "watermark"
  | "table-cell"
  | "floating-object"
  | "text-box"
  | "drawing-text"
  | "readonly-text"
  | "node-body"
  | "block-container"
  | "media"
  | "embed"
  | "content-control"
  | "interactive-widget"
  | "control";

/** Capability fact declared independently by layout roots and regions. */
export type QuireLayoutCapabilityKind =
  | "editable"
  | "selectable"
  | "focusable"
  | "copyable"
  | "commandable"
  | "accessible";

/** Consumer-neutral semantic role attached to an exact layout owner. */
export type QuireLayoutSemanticRole =
  | "document"
  | "section"
  | "group"
  | "blockquote"
  | "columns"
  | "table"
  | "row"
  | "cell"
  | "figure"
  | "object"
  | "text-box"
  | "text"
  | "media"
  | "embed"
  | "control"
  | "widget";

/** Search behavior declared by one exact layout owner. */
export type QuireLayoutSearchPolicy =
  | {
      /** Reads text from the exact source range. */
      readonly kind: "source-text";
    }
  | {
      /** Reads provider-declared searchable metadata. */
      readonly kind: "metadata";
      /** Searchable human-readable text. */
      readonly text: string;
      /** Optional additional searchable terms. */
      readonly keywords?: readonly string[] | undefined;
    }
  | {
      /** Excludes the owner from search consumers. */
      readonly kind: "excluded";
      /** Human-readable reason for the exclusion. */
      readonly reason: string;
    };

/** Semantic facts attached to one exact layout owner. */
export interface QuireLayoutSemanticDescriptor {
  /** Consumer-neutral semantic role. */
  readonly role: QuireLayoutSemanticRole;
  /** Optional accessible label that does not replace source text. */
  readonly label?: string | undefined;
  /** Optional longer accessible description. */
  readonly description?: string | undefined;
  /** Explicit search behavior for this owner. */
  readonly search: QuireLayoutSearchPolicy;
}

/** Export fallback class for content not native to one target format. */
export type QuireLayoutExportFallbackKind =
  | "native"
  | "semantic-degraded"
  | "visual-snapshot"
  | "plain-text"
  | "omitted-interaction";

/** Export fallback facts attached to a layout root or region. */
export interface QuireLayoutExportFallback {
  /** Fallback class used by export and clipboard adapters. */
  readonly kind: QuireLayoutExportFallbackKind;
  /** Optional target format to which this fallback applies. */
  readonly targetFormat?:
    | "docx"
    | "html"
    | "plain-text"
    | "image"
    | "clipboard"
    | undefined;
  /** Optional human-readable reason surfaced to diagnostics. */
  readonly reason?: string | undefined;
  /** Source metadata preserved for export or round-trip rehydration. */
  readonly sourceMetadata?: Readonly<Record<string, unknown>> | undefined;
}

/** Coordinate space owned by consumer-neutral layout products. */
export type QuireLayoutCoordinateSpaceKind =
  | "document"
  | "page"
  | "body"
  | "region-local"
  | "table-cell-local"
  | "shape-local"
  | "text-box-local"
  | "source-flow"
  | "sub-layout-local";

/** Point tagged with its owning layout coordinate space. */
export interface QuireLayoutCoordinatePoint<
  Space extends QuireLayoutCoordinateSpaceKind = QuireLayoutCoordinateSpaceKind
> {
  /** Coordinate space that owns the point. */
  readonly space: Space;
  /** Horizontal coordinate inside the owning space. */
  readonly x: number;
  /** Vertical coordinate inside the owning space. */
  readonly y: number;
}

/** Rectangle tagged with its owning layout coordinate space. */
export interface QuireLayoutCoordinateRect<
  Space extends QuireLayoutCoordinateSpaceKind = QuireLayoutCoordinateSpaceKind
> {
  /** Coordinate space that owns the rectangle. */
  readonly space: Space;
  /** Horizontal rectangle origin inside the owning space. */
  readonly x: number;
  /** Vertical rectangle origin inside the owning space. */
  readonly y: number;
  /** Rectangle width inside the owning space. */
  readonly width: number;
  /** Rectangle height inside the owning space. */
  readonly height: number;
}

/** One explicit conversion step between layout coordinate spaces. */
export interface QuireLayoutCoordinateConversionStep<
  From extends QuireLayoutCoordinateSpaceKind = QuireLayoutCoordinateSpaceKind,
  To extends QuireLayoutCoordinateSpaceKind = QuireLayoutCoordinateSpaceKind
> {
  /** Source coordinate space. */
  readonly from: From;
  /** Destination coordinate space. */
  readonly to: To;
  /** Input point before conversion. */
  readonly input: QuireLayoutCoordinatePoint<From>;
  /** Output point after conversion. */
  readonly output: QuireLayoutCoordinatePoint<To>;
  /** Horizontal scale applied by the conversion. */
  readonly scaleX: number;
  /** Vertical scale applied by the conversion. */
  readonly scaleY: number;
}

/** Explicit layout coordinate path retained for diagnostics and queries. */
export interface QuireLayoutCoordinatePath {
  /** Ordered coordinate spaces traversed by the query. */
  readonly spaces: readonly QuireLayoutCoordinateSpaceKind[];
  /** Concrete conversion steps used by the query. */
  readonly steps: readonly QuireLayoutCoordinateConversionStep[];
}

/** Stable root identifier in a layout snapshot. */
export interface QuireLayoutRootId {
  /** Opaque stable root id. */
  readonly value: string;
}

/** Stable region identifier inside one layout root. */
export interface QuireLayoutRegionId {
  /** Opaque stable region id. */
  readonly value: string;
}

/** Structural document node that should receive commands for one visual region. */
export interface QuireLayoutCommandOwnerRef {
  /** Exact document position immediately before the structural node. */
  readonly position: number;
  /** ProseMirror node type expected at the referenced position. */
  readonly nodeType: string;
  /** Optional stable node id used to validate refreshed document state. */
  readonly stableId?: string | undefined;
}

/** Source document identity carried by layout products. */
export interface QuireLayoutSourceRef {
  /** Stable source id from layout, extension, or adapter code. */
  readonly sourceId: string;
  /** Optional document range represented by the source. */
  readonly range?: QuireDocumentRange | undefined;
}

/** Snapshot-unique address for one layout region. */
export interface QuireLayoutRegionAddress {
  /** Root that owns this region. */
  readonly rootId: QuireLayoutRootId;
  /** Stable region id within the root. */
  readonly regionId: QuireLayoutRegionId;
  /** Optional repeated visual instance id. */
  readonly visualInstanceId?: string | undefined;
  /** Optional structural owner that receives commands for this region. */
  readonly commandOwner?: QuireLayoutCommandOwnerRef | undefined;
}

/** Reference to one visual or semantic layout region. */
export interface QuireLayoutRegionRef extends QuireLayoutRegionAddress {
  /** Region kind used by downstream consumers. */
  readonly kind: QuireLayoutRegionKind;
  /** Optional parent region address when the region is nested. */
  readonly parentRegion?: QuireLayoutRegionAddress | undefined;
}

/** Independent capability facts for one root, region, or exact product. */
export interface QuireLayoutCapabilitySet {
  /** Whether text input may mutate this owner. */
  readonly editable: boolean;
  /** Whether the owner or text inside it can be selected. */
  readonly selectable: boolean;
  /** Whether the owner can become a keyboard command target. */
  readonly focusable: boolean;
  /** Whether the owner can contribute to clipboard payloads. */
  readonly copyable: boolean;
  /** Whether commands may route directly to this owner. */
  readonly commandable: boolean;
  /** Whether accessibility consumers should expose this owner. */
  readonly accessible: boolean;
}

/** Consumer-neutral root facts retained by one layout snapshot. */
export interface QuireLayoutRoot {
  /** Stable root id. */
  readonly id: QuireLayoutRootId;
  /** Root kind used by layout and downstream routing. */
  readonly kind: QuireLayoutRootKind;
  /** Source document identity for this root. */
  readonly source: QuireLayoutSourceRef;
  /** Capabilities declared by the root. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Optional semantic facts declared by the exact root owner. */
  readonly semantics?: QuireLayoutSemanticDescriptor | undefined;
  /** Optional export fallbacks declared by the root. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Producer-owned metadata for diagnostics. */
  readonly diagnosticsMetadata?: Readonly<Record<string, unknown>> | undefined;
}

/** Consumer-neutral region facts retained by one layout snapshot. */
export interface QuireLayoutRegion {
  /** Stable region reference. */
  readonly ref: QuireLayoutRegionRef;
  /** Source document identity for this region. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Region bounds in the declared coordinate space. */
  readonly rect?: QuireRect | undefined;
  /** Coordinate space used by the region bounds. */
  readonly coordinateSpace?: QuireLayoutCoordinateSpaceKind | undefined;
  /** Capabilities declared by the region. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Optional semantic facts declared by this exact region occurrence. */
  readonly semantics?: QuireLayoutSemanticDescriptor | undefined;
  /** Optional export fallbacks declared by the region. */
  readonly exportFallbacks?: readonly QuireLayoutExportFallback[] | undefined;
  /** Producer-owned metadata for diagnostics. */
  readonly diagnosticsMetadata?: Readonly<Record<string, unknown>> | undefined;
}
