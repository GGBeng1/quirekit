import type { QuirePoint } from "@quirekit/renderer";
import type { QuireParagraphDecorationBorder } from "../../../layout/engine/block-types";

/** Physical side after paragraph direction has been resolved. */
export type ParagraphDecorationSide = "top" | "right" | "bottom" | "left";
/** Only the sides actually painted by the current pagination fragment. */
export type ParagraphFragmentBorders = Readonly<Partial<Record<ParagraphDecorationSide, QuireParagraphDecorationBorder>>>;
/** One closed ring of the double-border approximation. */
export type ParagraphBorderRing = "outer" | "inner";

/** Endpoints in the owning document's CSS-pixel coordinate space. */
export interface ParagraphBorderLine {
  /** Start of the centerline, extended through a visible adjoining border. */
  readonly from: QuirePoint;
  /** End of the centerline, extended through a visible adjoining border. */
  readonly to: QuirePoint;
}
