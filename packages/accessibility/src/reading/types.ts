import type { Node } from "@quirekit/pm";
import type { QuireAccessibleContainerDescription, QuireAccessibleMarkDescription, QuireAccessibleNodeDescription } from "../contract";

/** One inline text run and its contributed native formatting. */
export interface ReadingRun {
  /** Exact bounded text, newline, or unsupported-object replacement character. */
  readonly text: string;
  /** Semantics in schema mark order. */
  readonly marks: readonly QuireAccessibleMarkDescription[];
}

/** Inline projection whose source length can differ from a readonly object description. */
export interface ReadingInlineProjection {
  /** Bounded rendered text and contributed marks. */
  readonly runs: readonly ReadingRun[];
  /** Exclusive local source boundary, never inside an inline object. */
  readonly to: number;
  /** Whether any represented object prevents native text editing. */
  readonly hasObject: boolean;
}

/** One ancestor retained across a reading segment boundary. */
export interface ReadingAncestor {
  /** Canonical position before this container. */
  readonly from: number;
  /** Native structure descriptor. */
  readonly description: QuireAccessibleContainerDescription;
  /** One-based child index, used for partial list navigation. */
  readonly index: number;
  /** Total sibling count in the canonical parent. */
  readonly total: number;
}

/** One bounded item in an explicit reading segment. */
export interface ReadingItem {
  /** Canonical start of the represented source range. */
  readonly from: number;
  /** Canonical end of the represented source range. */
  readonly to: number;
  /** Native semantic descriptor. */
  readonly description: QuireAccessibleNodeDescription;
  /** Structural ancestors retained even when the segment starts inside a list. */
  readonly ancestors: readonly ReadingAncestor[];
  /** Bounded inline formatting for textblocks. */
  readonly runs: readonly ReadingRun[];
  /** Source text or explicit fallback description. */
  readonly text: string;
  /** Whether this item starts after the paragraph's first character. */
  readonly continued: boolean;
  /** Whether direct text entry is supported for this item. */
  readonly editable: boolean;
}

/** Version-bound segment, independent from visible Canvas/SVG pages. */
export interface ReadingSegment {
  /** Exact source version against which item positions were resolved. */
  readonly doc: Node;
  /** Items contained in the current segment. */
  readonly items: readonly ReadingItem[];
  /** Canonical continuation cursor, or null at the document end. */
  readonly next: number | null;
  /** Structural steps consumed by this bounded traversal. */
  readonly visited: number;
}
