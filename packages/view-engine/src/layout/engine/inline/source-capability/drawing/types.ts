import type { QuireDocumentRange } from "@quirekit/renderer";

/** Snapshot-local facts passed to the independent drawing owner. */
export interface QuireDrawingObjectSourceCapabilityResolverOptions {
  /** Current rich-text story ranges keyed by persisted story identity. */
  readonly storyRangesById?: ReadonlyMap<string, QuireDocumentRange> | undefined;
  /** Opaque document identity; the consumer layout only forwards it. */
  readonly document?: object;
}
