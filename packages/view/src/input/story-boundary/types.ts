import type { QuireLayoutRegionKind } from "@quirekit/layout/identity";

/** Header/footer region kinds that establish mounted input command boundaries. */
export type QuireStoryCommandBoundaryRegionKind = Extract<
  QuireLayoutRegionKind,
  "header" | "footer" | "drawing-text" | "footnote" | "endnote"
>;

/** Live structural and selectable bounds for one active auxiliary story. */
export interface QuireStoryCommandBoundary {
  /** Stable source id of the persisted story. */
  readonly sourceId: string;
  /** Retained region kind that activated story-scoped input. */
  readonly regionKind: QuireStoryCommandBoundaryRegionKind;
  /** First position inside the story node's structural content. */
  readonly from: number;
  /** Position immediately after the story node's structural content. */
  readonly to: number;
  /** First valid ProseMirror selection position inside the story. */
  readonly selectionFrom: number;
  /** Last valid ProseMirror selection position inside the story. */
  readonly selectionTo: number;
}
