import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutTranslation } from "../types";

/** Exact visual projection that can realize logical inline source anchors. */
export interface QuireInlineSourceOccurrenceProjection extends QuireLayoutTranslation {
  /** Zero-based page that owns the projected occurrence. */
  readonly pageIndex: number;
  /** Source range represented by this concrete projection. */
  readonly sourceRange: QuireDocumentRange;
  /** Snapshot-local identity of this projection occurrence. */
  readonly visualInstanceId: string;
  /** Exact receiving column bounds in document coordinates. */
  readonly columnRect: QuireRect;
  /** Exact receiving margin bounds in document coordinates. */
  readonly marginRect: QuireRect;
  /** Exact receiving page bounds in document coordinates. */
  readonly pageRect: QuireRect;
}

/** Whether missing projections are failures or intentionally unmounted sources. */
export type QuireInlineSourceOccurrenceProjectionMode = "complete" | "mounted-window";
