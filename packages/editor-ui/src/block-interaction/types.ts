import type { QuireMountedBlockFragment } from "@quirekit/core";
import type { BlockFact } from "@quirekit/extensions";

/** Semantic block joined to one exact visible occurrence. */
export interface EditorBlockOccurrence {
  /** Current identity and structural range. */
  readonly block: BlockFact;
  /** Exact fragment from the mounted geometry owner. */
  readonly fragment: QuireMountedBlockFragment;
}

/** Ephemeral drag presentation in client coordinates. */
export interface EditorBlockDragPreview {
  /** Current pointer in client CSS pixels for source-offset product previews. */
  readonly pointer: { readonly x: number; readonly y: number };
  /** Current ghost horizontal coordinate. */
  readonly x: number;
  /** Current ghost vertical coordinate. */
  readonly y: number;
  /** Number of complete source blocks. */
  readonly count: number;
  /** Short source content summary captured once at press, never serialized during movement. */
  readonly text: string;
  /** Current valid insertion line, or null. */
  readonly line: { readonly x: number; readonly y: number; readonly width: number } | null;
}
