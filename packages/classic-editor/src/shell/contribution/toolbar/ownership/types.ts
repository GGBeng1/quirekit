import type { QuireKitToolbarEntry } from "@quirekit/ui";

/** One feature-owned popup whose lifetime is coordinated by Classic. */
export interface ClassicToolbarPopupEntry {
  /** Stable path key within one retained feature. */
  readonly key: string;
  /** Original feature entry passed unchanged to its callbacks. */
  readonly item: QuireKitToolbarEntry;
  /** Original feature-local ancestry. */
  readonly path: readonly string[];
}
