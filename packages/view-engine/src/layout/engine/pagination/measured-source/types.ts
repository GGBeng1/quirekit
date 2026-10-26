import type {
  QuireMeasuredContainerItem,
  QuireMeasuredContainerPageLeadingBand,
  QuireMeasuredContainerSourceFragment
} from "@quirekit/layout/pagination";

/** Optional metadata supplied when pushing one measured container item. */
export interface QuireMeasuredSourceItemOptions {
  /** Shared group id used for widow/orphan line control. */
  readonly group?: string | undefined;
  /** Optional forced page break before this item. */
  readonly breakBefore?: "page" | undefined;
  /** Optional forced page or column break after this item. */
  readonly breakAfter?: "page" | "column" | undefined;
  /** Whether the complete item group should move together when possible. */
  readonly keepTogether?: boolean | undefined;
  /** Whether the item group should remain with its successor's first item. */
  readonly keepWithNext?: boolean | undefined;
  /** Group-local widow minimum overriding the document default. */
  readonly groupWidows?: number | undefined;
  /** Group-local orphan minimum overriding the document default. */
  readonly groupOrphans?: number | undefined;
  /** Capability-owned band to reserve before this item on continuation pages. */
  readonly pageLeadingBand?: QuireMeasuredContainerPageLeadingBand | undefined;
  /** Source-flow fragments that contributed to this measured item. */
  readonly sourceFragments?: readonly QuireMeasuredContainerSourceFragment[] | undefined;
}

/** Sink used by measured-source producers to append body items in flow order. */
export type QuireMeasuredSourceItemSink = (
  id: string,
  range: QuireMeasuredContainerItem["range"],
  top: number,
  bottom: number,
  itemOptions?: QuireMeasuredSourceItemOptions
) => void;
