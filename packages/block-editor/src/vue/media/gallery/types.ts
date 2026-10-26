import type { QuireKitImagePreviewItem } from "@quirekit/ui/vue";

/** Read-only media snapshot captured for one explicit viewing session. */
export interface BlockMediaGallery {
  /** Distinct media blocks in canonical document order. */
  readonly items: readonly QuireKitImagePreviewItem[];
  /** Index of the block that opened this session. */
  readonly index: number;
  /** Retained opening block, used for focus restoration while connected. */
  readonly origin: HTMLElement;
}
