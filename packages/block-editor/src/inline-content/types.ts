import type { Range } from "@quirekit/core";
import type { Node } from "@quirekit/pm";
import type { BlockSlotRef } from "@quirekit/extensions";
/** Shared insertion intent with captured source identity. */
export interface InlineContentRequest {
  /** Source snapshot guarding deferred writes. */ readonly doc: Node;
  /** Semantic intent. */ readonly kind: "date" | "emoji";
  /** Inline or slash replacement range. */ readonly range: Range;
  /** Captured structural insertion target. */ readonly destination?: BlockSlotRef;
  /** Existing date for repeated editing. */ readonly value: string;
  /** Existing atom boundary; present only for an anchored date edit. */ readonly position?: number;
}
/** Caller-supplied insertion/editing location. */
export interface InlineContentTarget {
  /** Existing date boundary. */ readonly position?: number;
  /** Slash replacement or ordinary text selection. */ readonly range?: Range;
  /** Above/below insertion location. */ readonly destination?: BlockSlotRef;
}
