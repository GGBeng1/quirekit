import type {
  OFDCompositeGraphicUnit,
  OFDDrawParam,
  OFDFont,
  OFDImage
} from "../resources";
import type { OFDPageImage } from "../document/page-resources";
import type { OFDAction } from "../action";

/** Rectangle in OFD millimetre coordinates. */
export interface OFDBox {
  /** Left coordinate in millimetres. */
  readonly x: number;
  /** Top coordinate in millimetres. */
  readonly y: number;
  /** Width in millimetres. */
  readonly width: number;
  /** Height in millimetres. */
  readonly height: number;
}

/** Six-value OFD affine transformation matrix. */
export type OFDMatrix = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number
];

/** Device color carried directly by one graphic object. */
export interface OFDColor {
  /** RGB byte channels. */
  readonly value: readonly [red: number, green: number, blue: number];
  /** Optional alpha channel from 0 through 255. */
  readonly alpha?: number;
}

/** Text content and placement for one `TextCode` element. */
export interface OFDTextCode {
  /** Authored Unicode text. */
  readonly text: string;
  /** Initial local X coordinate. */
  readonly x: number;
  /** Initial local Y coordinate. */
  readonly y: number;
  /** Horizontal offsets from each code point to the next code point. */
  readonly deltaX?: readonly number[];
  /** Vertical offsets from each code point to the next code point. */
  readonly deltaY?: readonly number[];
}

/** Character-to-glyph mapping carried by one OFD `CGTransform` element. */
export interface OFDCharacterGlyphTransform {
  /** Zero-based source-codepoint position in the TextObject content. */
  readonly codePosition: number;
  /** Number of source codepoints covered by this mapping. */
  readonly codeCount: number;
  /** Embedded-font glyph indices used for the covered source codepoints. */
  readonly glyphs: readonly number[];
}

/** Local baseline origin used by convenience text placement. */
export interface OFDTextOrigin {
  /** Local X coordinate in millimetres. */
  readonly x: number;
  /** Local Y coordinate in millimetres. */
  readonly y: number;
}

/** Move command in an OFD abbreviated path. */
export interface OFDMovePathCommand {
  /** Command discriminator. */
  readonly type: "move";
  /** Destination X coordinate. */
  readonly x: number;
  /** Destination Y coordinate. */
  readonly y: number;
}

/** Line command in an OFD abbreviated path. */
export interface OFDLinePathCommand {
  /** Command discriminator. */
  readonly type: "line";
  /** Destination X coordinate. */
  readonly x: number;
  /** Destination Y coordinate. */
  readonly y: number;
}

/** Quadratic Bézier command in an OFD abbreviated path. */
export interface OFDQuadraticPathCommand {
  /** Command discriminator. */
  readonly type: "quadratic";
  /** Control-point X coordinate. */
  readonly controlX: number;
  /** Control-point Y coordinate. */
  readonly controlY: number;
  /** Destination X coordinate. */
  readonly x: number;
  /** Destination Y coordinate. */
  readonly y: number;
}

/** Cubic Bézier command in an OFD abbreviated path. */
export interface OFDCubicPathCommand {
  /** Command discriminator. */
  readonly type: "cubic";
  /** First control-point X coordinate. */
  readonly control1X: number;
  /** First control-point Y coordinate. */
  readonly control1Y: number;
  /** Second control-point X coordinate. */
  readonly control2X: number;
  /** Second control-point Y coordinate. */
  readonly control2Y: number;
  /** Destination X coordinate. */
  readonly x: number;
  /** Destination Y coordinate. */
  readonly y: number;
}

/** Elliptical arc command in an OFD abbreviated path. */
export interface OFDArcPathCommand {
  /** Command discriminator. */
  readonly type: "arc";
  /** Ellipse X radius. */
  readonly radiusX: number;
  /** Ellipse Y radius. */
  readonly radiusY: number;
  /** Clockwise ellipse rotation in degrees. */
  readonly rotation: number;
  /** Whether the selected arc exceeds 180 degrees. */
  readonly largeArc: boolean;
  /** Whether the arc travels clockwise. */
  readonly sweep: boolean;
  /** Destination X coordinate. */
  readonly x: number;
  /** Destination Y coordinate. */
  readonly y: number;
}

/** Close command in an OFD abbreviated path. */
export interface OFDClosePathCommand {
  /** Command discriminator. */
  readonly type: "close";
}

/** One typed OFD abbreviated path operation. */
export type OFDPathCommand =
  | OFDMovePathCommand
  | OFDLinePathCommand
  | OFDQuadraticPathCommand
  | OFDCubicPathCommand
  | OFDArcPathCommand
  | OFDClosePathCommand;

/** One vector clip area attached to a graphic object. */
export interface OFDClip {
  /** Clip boundary relative to the owning graphic object's `Boundary`. */
  readonly boundary: OFDBox;
  /** Clip outline relative to `boundary`. */
  readonly commands: readonly OFDPathCommand[];
}

/** Options for drawing authored text on a page or layer. */
export interface OFDDrawTextOptions {
  /** Object boundary in page coordinates. */
  readonly boundary: OFDBox;
  /** Font resource owned by the same document. */
  readonly font: OFDFont;
  /** Font size in millimetres. */
  readonly size: number;
  /**
   * Explicit text placement; concatenated text must equal the authored text.
   * When omitted, the writer derives one horizontal code from embedded font
   * metrics.
   */
  readonly codes?: readonly OFDTextCode[];
  /**
   * Optional explicit character-to-glyph mappings for subset-font
   * interoperability when a reader cannot resolve the embedded family name.
   */
  readonly glyphTransforms?: readonly OFDCharacterGlyphTransform[];
  /** Optional local baseline origin for font-derived placement. */
  readonly origin?: OFDTextOrigin;
  /** Optional font-derived letter spacing in millimetres. */
  readonly letterSpacing?: number;
  /** Optional fill color. */
  readonly fillColor?: OFDColor;
  /** Optional stroke color. */
  readonly strokeColor?: OFDColor;
  /** Optional object alpha from 0 through 255. */
  readonly alpha?: number;
  /** Optional affine transform. */
  readonly ctm?: OFDMatrix;
  /** Optional clipping areas. */
  readonly clips?: readonly OFDClip[];
  /** Optional actions run in order when the graphic is clicked. */
  readonly actions?: readonly OFDAction[];
  /** Optional reusable same-document drawing parameter. */
  readonly drawParam?: OFDDrawParam;
}

/** Options for drawing a path on a page or layer. */
export interface OFDDrawPathOptions {
  /** Object boundary in page coordinates. */
  readonly boundary: OFDBox;
  /** Path commands relative to `boundary`. */
  readonly commands: readonly OFDPathCommand[];
  /** Optional fill color. */
  readonly fillColor?: OFDColor;
  /** Optional stroke color. */
  readonly strokeColor?: OFDColor;
  /** Optional stroke width in millimetres. */
  readonly lineWidth?: number;
  /** Optional alternating dash and gap lengths. */
  readonly dashPattern?: readonly number[];
  /** Optional line cap style. */
  readonly lineCap?: "Butt" | "Round" | "Square";
  /** Optional line join style. */
  readonly lineJoin?: "Miter" | "Round" | "Bevel";
  /** Optional fill rule. */
  readonly fillRule?: "NonZero" | "Even-Odd";
  /** Optional object alpha from 0 through 255. */
  readonly alpha?: number;
  /** Optional affine transform. */
  readonly ctm?: OFDMatrix;
  /** Optional clipping areas. */
  readonly clips?: readonly OFDClip[];
  /** Optional actions run in order when the graphic is clicked. */
  readonly actions?: readonly OFDAction[];
  /** Optional reusable same-document drawing parameter. */
  readonly drawParam?: OFDDrawParam;
}

/** Options for drawing one embedded image. */
export interface OFDDrawImageOptions {
  /** Object boundary in page coordinates. */
  readonly boundary: OFDBox;
  /** Optional affine transform. */
  readonly ctm?: OFDMatrix;
  /** Optional object alpha from 0 through 255. */
  readonly alpha?: number;
  /** Optional clipping areas. */
  readonly clips?: readonly OFDClip[];
  /** Optional image border. */
  readonly border?: OFDImageBorder;
  /** Optional actions run in order when the graphic is clicked. */
  readonly actions?: readonly OFDAction[];
  /** Optional reusable same-document drawing parameter. */
  readonly drawParam?: OFDDrawParam;
}

/** Options for placing a reusable composite graphic unit on a page. */
export interface OFDDrawCompositeOptions {
  /** Object boundary in page coordinates. */
  readonly boundary: OFDBox;
  /** Optional affine transform. */
  readonly ctm?: OFDMatrix;
  /** Optional object alpha from 0 through 255. */
  readonly alpha?: number;
  /** Optional clipping areas. */
  readonly clips?: readonly OFDClip[];
  /** Optional actions run in order when the graphic is clicked. */
  readonly actions?: readonly OFDAction[];
  /** Optional reusable same-document drawing parameter. */
  readonly drawParam?: OFDDrawParam;
}

/** Border drawn around an image object. */
export interface OFDImageBorder {
  /** Border width in millimetres. */
  readonly lineWidth: number;
  /** Border color. */
  readonly color: OFDColor;
  /** Optional corner radius in millimetres. */
  readonly cornerRadius?: number;
  /** Optional dash pattern. */
  readonly dashPattern?: readonly number[];
}

/** Options for one page layer. */
export interface OFDLayerOptions {
  /** Layer role; `Body` is used when omitted. */
  readonly type?: "Body" | "Background" | "Foreground" | "Custom";
}

/** Internal graphic object stored by the document builder. */
export type OFDGraphicObjectState =
  | {
    readonly type: "text";
    readonly text: string;
    readonly options: OFDResolvedDrawTextOptions;
  }
  | {
    readonly type: "path";
    readonly options: OFDDrawPathOptions;
  }
  | {
    readonly type: "image";
  readonly image: OFDImage | OFDPageImage;
    readonly options: OFDDrawImageOptions;
  }
  | {
    readonly type: "composite";
    readonly composite: OFDCompositeGraphicUnit;
    readonly options: OFDDrawCompositeOptions;
  };

/** Internal text options after explicit or font-derived placement is resolved. */
type OFDResolvedDrawTextOptions = Omit<
  OFDDrawTextOptions,
  "codes" | "glyphTransforms" | "letterSpacing" | "origin"
> & {
  /** Required resolved text codes. */
  readonly codes: readonly OFDTextCode[];
  /** Immutable explicit character-to-glyph mappings. */
  readonly glyphTransforms?: readonly OFDCharacterGlyphTransform[];
};
