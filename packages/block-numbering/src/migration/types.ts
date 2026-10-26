import type { Node } from "@quirekit/pm";
import type { WordNumberingRegistry } from "@quirekit/classic-numbering-model";
/** Flattened legacy root with its canonical resources. */
export interface FlattenedList {
  /** New paragraph nodes in original reading order. */
  readonly nodes: readonly Node[];
  /** Registry owning their sequence identities. */
  readonly registry: WordNumberingRegistry;
  /** Old textblock offsets mapped to new offsets for selection preservation. */
  readonly positions: readonly { readonly before: number; readonly after: number; readonly size: number }[];
}
