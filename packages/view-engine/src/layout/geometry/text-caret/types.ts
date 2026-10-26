import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../types";

/** Options used to resolve a text caret anchor from a layout tree. */
export interface QuireTextCaretAnchorOptions {
  /** Layout nodes to search in document order. */
  readonly nodes: readonly QuireLayoutNode[];
  /** Document position to map to visible caret geometry. */
  readonly position: number;
  /** Side preference when the position sits on a fragment boundary. */
  readonly side?: number | undefined;
  /** Width used for the returned caret rectangle. */
  readonly caretWidth?: number | undefined;
}

/** Options used to resolve a text caret from one exact layout-node path. */
export interface QuireTextCaretAnchorForPathOptions
  extends QuireTextCaretAnchorOptions {
  /** Exact root-to-leaf occurrence path selected by the interaction authority. */
  readonly nodePath: readonly QuireLayoutNode[];
}

/** Visible caret anchor resolved from layout text geometry. */
export interface QuireTextCaretAnchor {
  /** Document position represented by the visible caret anchor. */
  readonly position: QuireDocumentPosition;
  /** Caret rectangle in layout document coordinates. */
  readonly rect: QuireRect;
  /** Whether the anchor came from direct text or structural text fallback. */
  readonly source: "text" | "structural";
}

/** Boundary role of a text fragment candidate for a document position. */
export type QuireTextCaretAnchorBoundary = "start" | "end" | "inside";

/** Options used to resolve a text caret candidate within one layout owner. */
export interface QuireTextCaretAnchorCandidateOptions {
  /** Text fragments owned by one layout node. */
  readonly fragments: readonly QuireTextFragment[];
  /** Owner range whose strict interior may include unpainted inline positions. */
  readonly ownerRange: QuireDocumentRange;
  /** Document position to locate. */
  readonly position: number;
  /** Side preference when the position sits on a fragment boundary. */
  readonly side: number;
  /** Visible rectangle inherited from the layout node path. */
  readonly visibleRect: QuireRect;
}

/** Text fragment candidate that can answer a caret-position query. */
export interface QuireTextCaretAnchorCandidate {
  /** Text fragment that contains or is logically adjacent to the position. */
  readonly fragment: QuireTextFragment;
  /** Visible rectangle inherited from the layout node path. */
  readonly visibleRect: QuireRect;
  /** Position role within the fragment range. */
  readonly boundary: QuireTextCaretAnchorBoundary;
}
