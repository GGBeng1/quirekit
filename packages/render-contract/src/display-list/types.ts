import type { QuireDocumentRange } from "../document";
import type {
  QuireAffineTransform,
  QuirePoint,
  QuireRect,
  QuireSize
} from "../geometry";

/** Paint layer assigned to a display command. */
export type QuireDisplayCommandLayer = "content" | "overlay";

/** Base fields shared by all display commands. */
export interface QuireDisplayCommandBase {
  /** Stable command identifier within a display list. */
  readonly id: string;
  /** Optional document range represented by this command. */
  readonly range?: QuireDocumentRange;
  /** Optional paint layer used by layered render targets. */
  readonly layer?: QuireDisplayCommandLayer;
  /** Optional transient opacity multiplier applied by the render surface. */
  readonly opacity?: number;
}

/** Display command for a filled rectangle. */
export interface QuireFillRectCommand extends QuireDisplayCommandBase {
  /** Discriminator for filled rectangle commands. */
  readonly kind: "fill-rect";
  /** Rectangle to fill in canvas coordinate space. */
  readonly rect: QuireRect;
  /** CSS color or renderer-defined fill token. */
  readonly fillStyle: string;
}

/** Fill/stroke combinations supported by renderer-neutral text paint. */
export type QuireTextPaintMode = "fill" | "stroke" | "fill-stroke";

/** Display command for text. */
export interface QuireTextCommand extends QuireDisplayCommandBase {
  /** Whether browser geometry may measure this pass; omitted means content, decoration is paint-only. */
  readonly geometryRole?: "content" | "decoration";
  /** Layout-only trailing spacing included in rect.width; must not stretch the glyphs. */
  readonly trailingSpacing?: number | undefined;
  /** Discriminator for text commands. */
  readonly kind: "text";
  /** Approximate text paint bounds in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Text content to draw. */
  readonly text: string;
  /** Baseline origin in canvas coordinate space. */
  readonly origin: QuirePoint;
  /** CSS font shorthand or renderer-defined font token. */
  readonly font: string;
  /** Signed CSS-pixel character spacing for native text paint. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /** CSS color or renderer-defined fill token. */
  readonly fillStyle: string;
  /** Fill/stroke mode used for paint-only glyph effects. */
  readonly paintMode?: QuireTextPaintMode;
  /** Optional glyph-outline stroke token. */
  readonly strokeStyle?: string;
  /** Optional glyph-outline width in renderer coordinates. */
  readonly lineWidth?: number;
  /** Optional visual direction for native text layout. */
  readonly direction?: "ltr" | "rtl";
}

/** One positioned glyph inside a shaped display-list run. */
export interface QuireGlyphRunGlyphPlacement {
  /** Shaped glyph id in the resolved font face. */
  readonly glyphId: number;
  /** Source text cluster offset represented by the glyph. */
  readonly sourceCluster: number;
  /** Visual x offset from the run origin before glyph-specific offsets. */
  readonly x: number;
  /** Visual y offset from the run origin before glyph-specific offsets. */
  readonly y: number;
  /** Horizontal glyph advance in CSS pixels. */
  readonly xAdvance: number;
  /** Vertical glyph advance in CSS pixels. */
  readonly yAdvance: number;
  /** Horizontal glyph paint offset in CSS pixels. */
  readonly xOffset: number;
  /** Vertical glyph paint offset in CSS pixels. */
  readonly yOffset: number;
  /** Optional loaded font identifier that shaped this glyph. */
  readonly fontId?: string;
  /** Optional CSS family name that shaped this glyph. */
  readonly fontFamily?: string;
}

/** Whether a glyph-run contains enough font identity for exact glyph painting. */
export type QuireGlyphRunCoverage = "complete" | "partial";

/** Display command for a shaped glyph run with fallback text paint data. */
export interface QuireGlyphRunCommand extends QuireDisplayCommandBase {
  /** Whether browser geometry may measure native fallback text; omitted means content, decoration is paint-only. */
  readonly geometryRole?: "content" | "decoration";
  /** Layout-only trailing spacing included in rect.width, independent of glyph advances. */
  readonly trailingSpacing?: number | undefined;
  /** Discriminator for glyph-run commands. */
  readonly kind: "glyph-run";
  /** Approximate glyph-run paint bounds in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Original text content used as the native text paint fallback. */
  readonly text: string;
  /** Baseline origin in canvas coordinate space. */
  readonly origin: QuirePoint;
  /** CSS font shorthand or renderer-defined font token for fallback paint. */
  readonly font: string;
  /** Signed CSS-pixel character spacing for native fallback paint. */
  readonly letterSpacing?: number | undefined;
  /** Horizontal glyph-width ratio; tracking and vertical metrics remain independent. */
  readonly horizontalScale?: number | undefined;
  /** CSS color or renderer-defined fill token. */
  readonly fillStyle: string;
  /** Fill/stroke mode used for paint-only glyph effects. */
  readonly paintMode?: QuireTextPaintMode;
  /** Optional glyph-outline stroke token. */
  readonly strokeStyle?: string;
  /** Optional glyph-outline width in renderer coordinates. */
  readonly lineWidth?: number;
  /** Whether exact glyph painters may safely handle every visible glyph. */
  readonly glyphCoverage: QuireGlyphRunCoverage;
  /** Shaped glyph placements in visual order. */
  readonly glyphs: readonly QuireGlyphRunGlyphPlacement[];
  /** Optional visual direction for native text fallback layout. */
  readonly direction?: "ltr" | "rtl";
}

/** Text-like display command paintable through native text fallback paths. */
export type QuireTextPaintCommand = QuireTextCommand | QuireGlyphRunCommand;

/** Stroke cap style for line display commands. */
export type QuireLineCap = "butt" | "round" | "square";

/** Display command for a caret rectangle. */
export interface QuireCaretCommand extends QuireDisplayCommandBase {
  /** Discriminator for caret commands. */
  readonly kind: "caret";
  /** Caret rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /** CSS color or renderer-defined fill token. */
  readonly fillStyle: string;
}

/** Display command for a stroked line. */
export interface QuireLineCommand extends QuireDisplayCommandBase {
  /** Discriminator for line commands. */
  readonly kind: "line";
  /** Line start point in canvas coordinate space. */
  readonly from: QuirePoint;
  /** Line end point in canvas coordinate space. */
  readonly to: QuirePoint;
  /** CSS color or renderer-defined stroke token. */
  readonly strokeStyle: string;
  /** Stroke width in canvas coordinate space. */
  readonly lineWidth: number;
  /** Optional stroke dash pattern in canvas coordinate space. */
  readonly lineDash?: readonly number[];
  /** Optional stroke cap style. */
  readonly lineCap?: QuireLineCap;
}

/** Move-to display path segment. */
export interface QuireMoveToPathSegment {
  /** Discriminator for move-to path segments. */
  readonly kind: "move-to";
  /** Target point. */
  readonly point: QuirePoint;
}

/** Line-to display path segment. */
export interface QuireLineToPathSegment {
  /** Discriminator for line-to path segments. */
  readonly kind: "line-to";
  /** Target point. */
  readonly point: QuirePoint;
}

/** Quadratic curve display path segment. */
export interface QuireQuadraticCurveToPathSegment {
  /** Discriminator for quadratic curve path segments. */
  readonly kind: "quadratic-curve-to";
  /** Control point. */
  readonly control: QuirePoint;
  /** Target point. */
  readonly point: QuirePoint;
}

/** Bezier curve display path segment. */
export interface QuireBezierCurveToPathSegment {
  /** Discriminator for bezier curve path segments. */
  readonly kind: "bezier-curve-to";
  /** First control point. */
  readonly control1: QuirePoint;
  /** Second control point. */
  readonly control2: QuirePoint;
  /** Target point. */
  readonly point: QuirePoint;
}

/** Close-path display path segment. */
export interface QuireClosePathSegment {
  /** Discriminator for close-path segments. */
  readonly kind: "close-path";
}

/** Path segment supported by display path commands. */
export type QuirePathSegment =
  | QuireMoveToPathSegment
  | QuireLineToPathSegment
  | QuireQuadraticCurveToPathSegment
  | QuireBezierCurveToPathSegment
  | QuireClosePathSegment;

/** Display command for a filled or stroked path. */
export interface QuirePathCommand extends QuireDisplayCommandBase {
  /** Discriminator for path commands. */
  readonly kind: "path";
  /** Approximate path paint bounds in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Ordered path segments. */
  readonly segments: readonly QuirePathSegment[];
  /** Optional CSS color or renderer-defined fill token. */
  readonly fillStyle?: string;
  /** Optional CSS color or renderer-defined stroke token. */
  readonly strokeStyle?: string;
  /** Optional stroke width in canvas coordinate space. */
  readonly lineWidth?: number;
  /** Optional alternating dash and gap lengths in canvas coordinate space. */
  readonly lineDash?: readonly number[];
}

/** Display command for an image. */
export interface QuireImageSourceCrop {
  /** Positive inset or negative outset at the source top edge. */
  readonly top: number;
  /** Positive inset or negative outset at the source right edge. */
  readonly right: number;
  /** Positive inset or negative outset at the source bottom edge. */
  readonly bottom: number;
  /** Positive inset or negative outset at the source left edge. */
  readonly left: number;
}

/** Destination-space transform applied only while painting one image. */
export interface QuireImageTransform {
  /** Clockwise rotation in degrees in the y-down display-list coordinate space. */
  readonly rotation: number;
  /** Whether pixels are reflected across the destination vertical center axis. */
  readonly flipHorizontal: boolean;
  /** Whether pixels are reflected across the destination horizontal center axis. */
  readonly flipVertical: boolean;
}

/** Source-space sRGB channel adjustment, preserving the original alpha. */
export interface QuireImageColorAdjustment {
  /** Multiplier applied to each normalized RGB channel. */
  readonly slope: number;
  /** Offset added before clamping each channel to zero through one. */
  readonly intercept: number;
}

/** Display command for an image. */
export interface QuireImageCommand extends QuireDisplayCommandBase {
  /** Discriminator for image commands. */
  readonly kind: "image";
  /** Destination rectangle in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Opaque portable resource identity; never a browser-fetchable URL. */
  readonly resourceKey?: string;
  /** Optional runtime image source for Canvas 2D. */
  readonly source?: CanvasImageSource;
  /** Optional resolved image URL for SVG/static output. */
  readonly href?: string;
  /** Optional normalized crop intent resolved by a mounted resource owner. */
  readonly sourceCrop?: QuireImageSourceCrop;
  /** Optional complete intrinsic source size used by cropped SVG paint. */
  readonly sourceSize?: QuireSize;
  /** Optional absolute crop rectangle in intrinsic source coordinates. */
  readonly sourceRect?: QuireRect;
  /** Optional center-fixed destination rotation and reflection. */
  readonly transform?: QuireImageTransform | undefined;
  /** Optional source-space channel adjustment, applied before destination transforms. */
  readonly colorAdjustment?: QuireImageColorAdjustment;
}

/** Display command for a clipped command group. */
export interface QuireClipCommand extends QuireDisplayCommandBase {
  /** Discriminator for clipped command groups. */
  readonly kind: "clip";
  /** Rectangular clip bounds in canvas coordinate space. */
  readonly rect: QuireRect;
  /** Optional affine applied to the clip and every nested paint command. */
  readonly transform?: QuireAffineTransform | undefined;
  /** Optional axis-aligned paint bounds after applying `transform`. */
  readonly visualBounds?: QuireRect | undefined;
  /** Commands to paint inside the clip. */
  readonly commands: readonly QuireDisplayCommand[];
}

/** Paintable display command produced by the canvas view. */
export type QuireDisplayCommand =
  | QuireFillRectCommand
  | QuireTextCommand
  | QuireGlyphRunCommand
  | QuireCaretCommand
  | QuireLineCommand
  | QuirePathCommand
  | QuireImageCommand
  | QuireClipCommand;

/** Immutable list of display commands for a layout snapshot. */
export interface QuireDisplayList {
  /** Bounds that contain all commands in the list. */
  readonly bounds: QuireRect;
  /** Ordered commands to paint. */
  readonly commands: readonly QuireDisplayCommand[];
}

/** Content and overlay display lists split from one composite list. */
export interface QuireDisplayListLayers {
  /** Commands that paint persistent document content. */
  readonly content: QuireDisplayList;
  /** Commands that paint transient selection, caret, and decoration overlays. */
  readonly overlay: QuireDisplayList;
}
