/** Options for creating one portable Unicode-preserving font subset. */
export interface OFDFontSubsetOptions {
  /** Unicode scalar values that must remain addressable through the subset cmap. */
  readonly codePoints: Iterable<number>;
  /** Whether TrueType hinting programs should be preserved; defaults to false. */
  readonly preserveHinting?: boolean;
  /** Whether kerning/layout data should be preserved; defaults to false. */
  readonly preserveKerning?: boolean;
}

/** Standalone sfnt outline flavor accepted by OFD embedding. */
export type OFDSfntType = "otf" | "ttf";
