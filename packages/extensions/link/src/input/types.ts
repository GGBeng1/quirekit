import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type { LinkRange } from "../types";

/** One synchronous native completion intent; never persisted in the document. */
export interface LinkTypingIntent extends LinkRange {
  /** Exact pre-input immutable document. */
  readonly doc: ProseMirrorNode;
  /** Caret before the completion character/Enter. */
  readonly caret: number;
  /** Actual whitespace, or null for ordinary Enter. */
  readonly text: string | null;
}
