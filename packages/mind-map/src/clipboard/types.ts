import type { MindMapDocument, MindMapNode } from "../model/types";
import type { MindMapAnnotation } from "../annotations/types";

/** Portable selected subtrees, independent of their original canvas or host. */
export interface MindMapClipboard {
  /** Clipboard contract version, separate from document versions. */ readonly version: 1 | 2 | 3 | 4;
  /** Ordered topmost selected roots, including hidden descendants. */ readonly topics: readonly MindMapNode[];
  /** Objects wholly contained in this fragment, required from version 3. */ readonly annotations?: readonly MindMapAnnotation[];
}

/** Atomic paste result with newly generated identities for selection. */
export interface MindMapPasteResult {
  /** Fully validated document after insertion. */ readonly document: MindMapDocument;
  /** Fresh top-level identities, in insertion order. */ readonly ids: readonly string[];
}
