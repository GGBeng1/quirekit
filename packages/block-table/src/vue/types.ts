import type { Editor } from "@quirekit/core";
import type { BlockTableTarget } from "../ui/types";
import type { BlockTableHeading } from "../styles/types";
/** Shared state supplied to contextual table controls. */
export interface BlockTableToolbarContext {
  /** Canonical command owner. */
  readonly editor: Editor;
  /** Exact table and cell selection. */
  readonly target: BlockTableTarget;
  /** @param key - Position-based emphasis. @param value - Requested state. Applies an owned update while keeping its popup open. */
  readonly heading?: (key: BlockTableHeading, value: boolean) => void;
}
