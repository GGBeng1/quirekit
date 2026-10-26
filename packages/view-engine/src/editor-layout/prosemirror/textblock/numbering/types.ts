import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireDocumentFontTheme } from "@quirekit/core";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireListMarkerCollisionPolicy } from "../../../types";
import type { QuireTextblockIndentationGeometry } from "../indentation";
import type { QuireListMarker, QuireParagraphModelProfile } from "../../../../document-profile/types";

/** Measured marker inputs, resolved before editable body shaping. */
export interface CreateWordNumberingMarkerFragmentOptions {
  /** Stable owning block identity. */
  readonly id: string;
  /** Effective list-marker semantics. */
  readonly marker: QuireListMarker;
  /** Available paragraph-local width in CSS pixels. */
  readonly paragraphWidth: number;
  /** First editable document position. */
  readonly contentStart: number;
  /** Body interval before marker collision handling. */
  readonly geometry: QuireTextblockIndentationGeometry;
  /** Inherited paragraph font. */
  readonly font: string;
  /** Inherited paragraph-mark color. */
  readonly inheritedTextColor?: string | undefined;
  /** Inherited paragraph-mark decorations. */
  readonly inheritedTextDecoration?: readonly ("underline" | "line-through")[] | undefined;
  /** Theme used to resolve marker font slots. */
  readonly documentFontTheme?: QuireDocumentFontTheme | undefined;
  /** Base line strut height. */
  readonly lineHeight: number;
  /** Base line ascent. */
  readonly baseline: number;
  /** Paragraph direction used for physical/logical projection. */
  readonly baseDirection: "ltr" | "rtl" | "auto";
  /** Effective pitch in CSS pixels for character-relative measurements. */
  readonly characterPitch: number;
  /** Paragraph semantics resolving indentation. */
  readonly paragraphModel?: QuireParagraphModelProfile | undefined;
  /** Host font-metrics authority. */
  readonly textMeasurer: QuireTextMeasurer;
  /** View policy for suffix fallback and first-line collisions. */
  readonly collisionPolicy?: QuireListMarkerCollisionPolicy | undefined;
}

/** Non-editable marker and the space it reserves before body shaping. */
export interface WordNumberingMarkerFragmentPlan {
  /** Generated fragment in paragraph-local coordinates. */
  readonly fragment: QuireTextFragment;
  /** Logical suffix advance in CSS pixels. */
  readonly suffixAdvance: number;
  /** Explicit marker ascent contributed to the first line. */
  readonly firstLineAscent?: number | undefined;
  /** Upward baseline shift applied when the marker aligns to the first line. */
  readonly baselineShift?: number | undefined;
}

/** Input required to retain one generated Word marker as an interactive product. */
export interface CreateWordNumberingMarkerProductsOptions {
  /** Stable layout block id used to namespace retained products. */
  readonly id: string;
  /** ProseMirror node type represented by the owning paragraph-like block. */
  readonly sourceKind: string;
  /** Complete paragraph range represented by the marker. */
  readonly range: QuireDocumentRange;
  /** Resolved list-marker semantics. */
  readonly marker: QuireListMarker;
  /** Paragraph semantics resolving the marker interaction. */
  readonly paragraphModel?: QuireParagraphModelProfile | undefined;
  /** Generated marker fragment carrying final local geometry. */
  readonly fragment: QuireTextFragment;
  /** Editable first-line body origin after hanging-indent resolution. */
  readonly bodyStartX: number;
}
