import type { DrawingPresetName } from "../presets/types";
import type { DrawingResizePolicy } from "./resize/types";

/** Finite point in a custom path's own coordinate space. */
export interface DrawingShapePoint {
  /** Horizontal coordinate. */
  readonly x: number;
  /** Vertical coordinate. */
  readonly y: number;
}

/** Numeric path operation; formulas and guides remain preservation evidence. */
export type DrawingShapeSegment =
  | { readonly kind: "move-to" | "line-to"; readonly point: DrawingShapePoint }
  | { readonly kind: "quadratic-curve-to"; readonly control: DrawingShapePoint; readonly point: DrawingShapePoint }
  | { readonly kind: "bezier-curve-to"; readonly control1: DrawingShapePoint; readonly control2: DrawingShapePoint; readonly point: DrawingShapePoint }
  | { readonly kind: "close-path" };

/** Independent custom path, scaled into the drawing's requested extent. */
export interface DrawingShapePath {
  /** Positive horizontal coordinate-space extent. */
  readonly width: number;
  /** Positive vertical coordinate-space extent. */
  readonly height: number;
  /** Whether this path participates in shape fill. */
  readonly fill: boolean;
  /** Whether this path participates in shape stroke. */
  readonly stroke: boolean;
  /** Ordered numeric operations beginning with a move. */
  readonly segments: readonly DrawingShapeSegment[];
}

/** Normalized geometry-owned text rectangle before body insets are applied. */
export interface DrawingShapeTextRect {
  /** Left fraction of the drawing width. */
  readonly left: number;
  /** Top fraction of the drawing height. */
  readonly top: number;
  /** Right fraction of the drawing width. */
  readonly right: number;
  /** Bottom fraction of the drawing height. */
  readonly bottom: number;
}

/** Preset or fixed numeric custom geometry of a drawing shape. */
export type DrawingShapeGeometry =
  | { readonly kind: "preset"; readonly preset: DrawingPresetName; readonly adjustment?: number; readonly adjustments?: Readonly<Record<string, number>> }
  | { readonly kind: "custom"; readonly paths: readonly DrawingShapePath[]; readonly textRect?: DrawingShapeTextRect };

/** Drawing geometry families. */
export type DrawingKind =
  | "shape"
  | "rectangle"
  | "ellipse"
  | "line"
  | "horizontal-text-box"
  | "picture"
  | "embedded";

/** Opaque reference to independently owned embedded content. */
export interface DrawingEmbeddedReference {
  /** Document-local stable content identity, interpreted only by its owner. */
  readonly contentId: string;
  /** Persisted display image used while the owner's renderer is not loaded. */
  readonly replacement?: DrawingEmbeddedReplacement;
}

/**
 * Persisted PNG standing in for embedded content, like an OLE presentation image.
 * The owner accepts it only while `signature` matches its current content.
 */
export interface DrawingEmbeddedReplacement {
  /** Owner-defined content signature the image was rendered from. */
  readonly signature: string;
  /** PNG data URL. */
  readonly dataUrl: string;
  /** PNG width in pixels. */
  readonly width: number;
  /** PNG height in pixels. */
  readonly height: number;
}

/** Transient presentation facts; never persisted as document content. */
export interface DrawingEmbeddedPresentation {
  /** Prepared resource identity accepted by the mounted image pipeline. */
  readonly resourceKey?: string;
  /** Description shown while no prepared image is available. */
  readonly label: string;
  /** Input revision used to invalidate retained paint. */
  readonly signature: string;
  /** Explicit owner authorization and transient bounds for resizing this embedding. */
  readonly resizePolicy?: DrawingResizePolicy;
}

/** Requested drawing extent before layout constraints are applied. */
export interface DrawingExtent {
  /** Requested inline size; line families may have one zero-sized axis. */
  readonly width: number;
  /** Requested block size; line families may have one zero-sized axis. */
  readonly height: number;
}

/** Persisted drawing transform intent. */
export interface DrawingTransform {
  /** Clockwise rotation in degrees. */
  readonly rotation: number;
  /** Whether the drawing is mirrored across its vertical axis. */
  readonly flipHorizontal: boolean;
  /** Whether the drawing is mirrored across its horizontal axis. */
  readonly flipVertical: boolean;
  /** Whether manipulation preserves the requested aspect ratio. */
  readonly lockAspectRatio: boolean;
}

/** Canonical drawing fill. */
export interface DrawingFill {
  /** Whether fill is disabled or uses one solid color. */
  readonly kind: "none" | "solid";
  /** Solid color token, or null when fill is disabled. */
  readonly color: string | null;
  /** Fill opacity from zero through one. */
  readonly opacity: number;
}

/** Canonical drawing stroke. */
export interface DrawingStroke {
  /** Whether stroke is disabled or uses one solid color. */
  readonly kind: "none" | "solid";
  /** Solid color token, or null when stroke is disabled. */
  readonly color: string | null;
  /** Stroke width in layout units. */
  readonly width: number;
  /** Stroke opacity from zero through one. */
  readonly opacity: number;
  /** Canonical dash preset. */
  readonly dash: "solid" | "dash" | "dot" | "dash-dot";
}

/** Independent visual appearance owned by a drawing payload. */
export interface DrawingAppearance {
  /** Drawing fill. */
  readonly fill: DrawingFill;
  /** Drawing outline. */
  readonly stroke: DrawingStroke;
}

/** Insets between a drawing frame and its rich-text story. */
export interface DrawingTextInsets {
  /** Block-start inset. */
  readonly top: number;
  /** Inline-end inset. */
  readonly right: number;
  /** Block-end inset. */
  readonly bottom: number;
  /** Inline-start inset. */
  readonly left: number;
}

/** Persisted text-body layout properties independent of rich story content. */
export interface DrawingTextBody {
  /** Frame-to-text insets. */
  readonly insets: DrawingTextInsets;
  /** Vertical placement of text inside the frame. */
  readonly verticalAlignment: "top" | "center" | "bottom";
  /** Whether rich text wraps inside the frame extent. */
  readonly wrapInside: boolean;
  /** Clockwise text rotation in degrees. */
  readonly rotation: number;
  /** Whether text stays visually upright when the drawing rotates. */
  readonly upright: boolean;
  /** Text/frame fitting policy. */
  readonly autofit: "none" | "shape-to-text" | "shrink-text" | "fit-frame";
  /** Optional glyph opacity; absence is fully opaque. */
  readonly opacity?: number;
}

/**
 * Canonical payload of one drawing object.
 *
 * @typeParam Picture - Raster picture semantics owned by the document model.
 */
export interface DrawingPayload<Picture = unknown> {
  /** Stable identity of the drawing payload. */
  readonly drawingId: string;
  /** Drawing geometry family. */
  readonly kind: DrawingKind;
  /** Explicit geometry required for the shape kind; absent on legacy kinds. */
  readonly geometry?: DrawingShapeGeometry;
  /** Requested drawing extent. */
  readonly extent: DrawingExtent;
  /** Drawing transform intent. */
  readonly transform: DrawingTransform;
  /** Drawing fill and stroke. */
  readonly appearance: DrawingAppearance;
  /** Optional text-body properties; rich content remains in a referenced story. */
  readonly textBody: DrawingTextBody | null;
  /** Optional raster Picture semantics, present only for the picture kind. */
  readonly picture: Picture | null;
  /** Independent embedded content reference, present only for the embedded kind. */
  readonly embedded?: DrawingEmbeddedReference;
}
