import type { HtmlFragment, HtmlRange } from "../parse/types";
import type { Text } from "@quirekit/cm-state";

/** First HTML hit in a browser multi-click sequence, invalidated with its source document. */
export interface HtmlPointer {
  /** Canonical source position before delimiters are revealed. */
  readonly position: number;
  /** Original viewport x coordinate. */
  readonly x: number;
  /** Original viewport y coordinate. */
  readonly y: number;
  /** Exact source identity; no snapshot or full-document serialization. */
  readonly document: Text;
}

/** Safe, source-addressed projection plan; DOM nodes are never retained in a document state. */
export interface PreparedHtml {
  /** Original source ranges and tag vocabulary. */
  readonly fragment: HtmlFragment;
  /** Sanitized attributes by original element start, with fixed generated classes added later. */
  readonly attributes: ReadonlyMap<number, Readonly<Record<string, string>>>;
  /** Decoded display characters with original source ranges. */
  readonly entities: readonly (HtmlRange & { readonly text: string })[];
}
