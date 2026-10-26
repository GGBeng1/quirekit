/** Independently authorable logical paragraph edge. */
export type WordParagraphBorderSide = "top" | "start" | "bottom" | "end";
/** Atomic topology, applied independently to each selected paragraph. */
export type WordParagraphBorderPreset = "none" | "bottom" | "top" | "box" | "start" | "end";
/** Complete authoring pen, using OOXML-native units. */
export interface WordParagraphBorderPen {
  /** Supported visible line pattern. */
  readonly style: "single" | "dotted" | "dashed" | "double";
  /** Opaque RGB or automatic text color. */
  readonly color: string;
  /** Integer width in eighths of a point, from 2 through 96. */
  readonly sizeEighthPoints: number;
  /** Integer distance from text in points, from 0 through 31. */
  readonly spacePoints: number;
}
/** A field-level update applied only to enabled visible edges. */
export type WordParagraphBorderPatch = Partial<WordParagraphBorderPen>;
/** One atomic appearance-only operation; null fill means explicit no fill. */
export type WordParagraphDecorationOperation =
  | { readonly kind: "preset"; readonly preset: WordParagraphBorderPreset; readonly pen: WordParagraphBorderPen }
  | { readonly kind: "side"; readonly side: WordParagraphBorderSide; readonly enabled: boolean; readonly pen: WordParagraphBorderPen }
  | { readonly kind: "border"; readonly patch: WordParagraphBorderPatch }
  | { readonly kind: "fill"; readonly color: string | null }
  | { readonly kind: "restore" };
