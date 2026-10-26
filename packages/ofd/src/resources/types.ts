import type { OFDImage } from "./handles";

/** Supported embedded font container. */
export type OFDFontFormat = "TrueType" | "OpenType";

/** Options for one embedded or logical font resource. */
export interface OFDFontOptions {
  /** Standard font name. */
  readonly fontName: string;
  /** Optional family name. */
  readonly familyName?: string;
  /** Optional font container hint; byte signatures are still validated. */
  readonly format?: OFDFontFormat;
  /** Optional charset declaration. */
  readonly charset?: "unicode" | "symbol" | "prc" | "big5" | "shift-jis" | "wansung";
  /** Whether the face is bold. */
  readonly bold?: boolean;
  /** Whether the face is italic. */
  readonly italic?: boolean;
  /** Whether the face uses serifs. */
  readonly serif?: boolean;
  /** Whether the face is fixed-width. */
  readonly fixedWidth?: boolean;
}

/** Supported embedded image format. */
export type OFDImageFormat = "PNG" | "JPEG";

/** Options for one embedded image resource. */
export interface OFDImageOptions {
  /** Optional explicit format; byte signatures are still validated. */
  readonly format?: OFDImageFormat;
}

/** Options used to register one reusable composite graphic unit. */
export interface OFDCompositeGraphicUnitOptions {
  /** Composite coordinate-space width in millimetres. */
  readonly width: number;
  /** Composite coordinate-space height in millimetres. */
  readonly height: number;
  /** Optional same-document image used as the resource thumbnail. */
  readonly thumbnail?: OFDImage;
}

/** Options for one embedded attachment. */
export interface OFDAttachmentOptions {
  /** File name presented to the reader. */
  readonly name: string;
  /** Optional media or file format label. */
  readonly format?: string;
  /** Optional ISO-8601 creation time. */
  readonly creationDate?: string;
  /** Optional ISO-8601 modification time. */
  readonly modificationDate?: string;
  /** Whether the attachment is visible to users. */
  readonly visible?: boolean;
  /** Optional producer-defined usage label. */
  readonly usage?: string;
}
