import type { QuireMountedBlockFragment } from "@quirekit/core";

/** Shared CSS rectangle for marquee admission, query and presentation. */
export type EditorBlockMarqueeRect = QuireMountedBlockFragment["rect"];

/** Transient presentation only; the actual selected content lives in PM selection. */
export interface EditorBlockMarqueePreview {
  /** Current client CSS rectangle. */
  readonly rect: EditorBlockMarqueeRect;
  /** Number of complete sibling blocks in the canonical range. */
  readonly count: number;
}
