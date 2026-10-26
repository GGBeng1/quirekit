import type { Node } from "@quirekit/pm";
import type { Range } from "@quirekit/core";
import type { BlockSlotRef } from "@quirekit/extensions";
/** One canonical occurrence of a reference or definition. */
export interface NoteOccurrence {
  /** Document boundary. */ readonly from: number;
  /** Exclusive boundary. */ readonly to: number;
  /** Immutable source. */ readonly node: Node;
}
/** Derived association, never stored as a second document. */
export interface BlockNote {
  /** Persistent association key. */ readonly id: string;
  /** First-reference order; zero means unreferenced. */ readonly number: number;
  /** All shared references. */ readonly references: readonly NoteOccurrence[];
  /** Definitions; multiple entries are an explicit import conflict. */ readonly definitions: readonly NoteOccurrence[];
}
/** Optional source-bound insertion location. */
export interface NoteInsert {
  /** Replaced inline range or slash paragraph. */ readonly range?: Range;
  /** Captured block insertion slot. */ readonly destination?: BlockSlotRef;
}
/** Selection-owned footnote end retained while its toolbar takes native focus. */
export interface NoteTarget {
  /** Accepted immutable document. */ readonly doc: Node;
  /** Position immediately before the note end. */ readonly pos: number;
  /** Canonical reference or definition. */ readonly node: Node;
}
