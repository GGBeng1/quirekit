/** One detached topic entry for a visible outline/search consumer. */
export interface MindMapOutlineEntry {
  /** Stable canonical topic identity. */ readonly id: string;
  /** Literal topic text. */ readonly text: string;
  /** Parent identity; null for main and independent roots. */ readonly parentId: string | null;
  /** Depth within this independent tree. */ readonly depth: number;
  /** Whether any ancestor is folded on the canvas. */ readonly hidden: boolean;
  /** Persistent folding of this topic's own children. */ readonly collapsed: boolean;
  /** Whether this topic belongs to an independent tree. */ readonly free: boolean;
}
