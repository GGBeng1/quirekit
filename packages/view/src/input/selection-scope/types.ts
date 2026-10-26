import type { QuireLayoutRegionKind } from "@quirekit/layout/identity";

/** Region kinds whose content can own mounted Select All. */
export type QuireSelectionScopeBoundaryRegionKind = Extract<
  QuireLayoutRegionKind,
  "body" | "header" | "footer" | "drawing-text" | "footnote" | "endnote"
>;

/** Live selectable boundary for one mounted content source. */
export interface QuireSelectionScopeBoundary {
  /** Stable source identity represented by the active retained root. */
  readonly sourceId: string;
  /** Retained region kind that owns the active selection scope. */
  readonly regionKind: QuireSelectionScopeBoundaryRegionKind;
  /** First position inside the source's structural content. */
  readonly from: number;
  /** Position immediately after the source's structural content. */
  readonly to: number;
  /** First valid ProseMirror selection position inside the source. */
  readonly selectionFrom: number;
  /** Last valid ProseMirror selection position inside the source. */
  readonly selectionTo: number;
}
