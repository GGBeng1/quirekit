import type { MindMapLayout } from "../model/types";

/** Portable authoring input for a program or structured model output. */
export interface MindMapOutline {
  /** Literal topic text; markup is displayed as text. */
  readonly text: string;
  /** Ordered child topics; leaves use an empty array. */
  readonly children: readonly MindMapOutline[];
}

/** Host-owned defaults for creating a new document. */
export interface MindMapCreateOptions {
  /** Automatic tree layout, defaulting to mind-map. */
  readonly layout?: MindMapLayout;
}
