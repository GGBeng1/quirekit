import type { DecorationSet } from "@quirekit/pm";

/** A complete chapter in the document's direct-child scope. */
export interface BlockSection {
  /** Persistent heading identity. */
  readonly id: string;
  /** Position before the heading. */
  readonly from: number;
  /** Position after the heading, where folding begins. */
  readonly body: number;
  /** First position outside the chapter. */
  readonly to: number;
  /** Semantic outline level. */
  readonly level: number;
}

/** Instance-only folding projection; never serialized into content. */
export interface BlockSectionState {
  /** Current immutable document's section index. */
  readonly sections: readonly BlockSection[];
  /** Stable identity index reused during selection-only updates. */
  readonly byId: ReadonlyMap<string, BlockSection>;
  /** Persistent identities of folded headings. */
  readonly folded: ReadonlySet<string>;
  /** Retained control and visibility presentation. */
  readonly decorations: DecorationSet;
}
