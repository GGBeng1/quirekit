import type { QuireLayoutBox } from "../types";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerItem
} from "@quirekit/layout/pagination";
import { groupQuireTextFragmentsIntoLines } from "@quirekit/layout/pagination";
import { createQuireTextLineSourceFragment } from "./measured-source/provenance";
import { pushQuireTableRowMeasuredItems } from "./measured-source/table-row-items";
import { readQuireLayoutBoxChildren } from "./measured-source/children";
import { paragraphBorderLineEnvelope } from "./measured-source/paragraph-borders";
import type {
  QuireMeasuredSourceItemOptions,
  QuireMeasuredSourceItemSink
} from "./measured-source/types";

/** Cached item after applying the sibling gap above it. */
interface QuireExternalMeasuredSourceGapCacheEntry {
  /** Combined gapBefore value stored on the adjusted item. */
  readonly gapBefore: number;
  /** Measured item carrying the external sibling gap. */
  readonly item: QuireMeasuredContainerItem;
}

/** Last external-gap adjustment keyed by the box-local first item identity. */
const externalMeasuredSourceGapStore =
  new WeakMap<QuireMeasuredContainerItem, QuireExternalMeasuredSourceGapCacheEntry>();

/** Reusable text-line prefix returned by the measured-source cache. */
export interface QuireMeasuredSourceTextPrefixReuse {
  /** Box-local measured items that can be retained from the previous text box. */
  readonly items: readonly QuireMeasuredContainerItem[];
  /** Current text fragments after the retained prefix that still need measuring. */
  readonly suffixFragments: readonly QuireTextFragment[];
}

/** Body measured item span owned by one top-level layout box. */
export interface QuireMeasuredSourceBodyBoxSpan {
  /** Inclusive measured body item index where the box starts. */
  readonly itemStart: number;
  /** Exclusive measured body item index where the box ends. */
  readonly itemEnd: number;
}

/** Reusable measured body prefix returned by the measured-source cache. */
export interface QuireMeasuredSourceBodyPrefixReuse {
  /** Body measured items retained from the previous container. */
  readonly items: readonly QuireMeasuredContainerItem[];
  /** Exclusive item index where the reusable prefix ends in `items`. */
  readonly itemEnd: number;
  /** Per-box item spans retained from the previous container. */
  readonly spans: readonly QuireMeasuredSourceBodyBoxSpan[];
  /** Number of current top-level boxes covered by the retained prefix. */
  readonly boxCount: number;
  /** Last flow bottom after the retained prefix items. */
  readonly previousBottom: number | null;
}

/** Reusable measured body suffix returned by the measured-source cache. */
export interface QuireMeasuredSourceBodySuffixReuse {
  /** Body measured items retained from the previous container and shifted forward. */
  readonly items: readonly QuireMeasuredContainerItem[];
  /** Per-box item spans within `items`, relative to the returned suffix item run. */
  readonly spans: readonly QuireMeasuredSourceBodyBoxSpan[];
  /** Number of current top-level boxes covered by the retained suffix. */
  readonly boxCount: number;
  /** Last flow bottom after the retained suffix items. */
  readonly previousBottom: number | null;
}

/** Request for appending a reusable measured body suffix directly into a target. */
export interface QuireMeasuredSourceBodySuffixAppendRequest {
  /** Current top-level layout boxes. */
  readonly boxes: readonly QuireLayoutBox[];
  /** First current top-level box to reuse. */
  readonly startBoxIndex: number;
  /** Flow bottom before the suffix is appended. */
  readonly previousBottom: number | null;
  /** Mutable measured item target receiving shifted suffix items. */
  readonly items: QuireMeasuredContainerItem[];
  /** Mutable body item spans receiving shifted suffix spans. */
  readonly spans: QuireMeasuredSourceBodyBoxSpan[];
  /** Index offset used when writing spans into the target. */
  readonly spanIndexOffset: number;
}

/** Result of appending a reusable measured body suffix. */
export interface QuireMeasuredSourceBodySuffixAppendResult {
  /** Number of current top-level boxes covered by the appended suffix. */
  readonly boxCount: number;
  /** Last flow bottom after the appended suffix items. */
  readonly previousBottom: number | null;
}

/** Cache adapter used while converting layout boxes into measured pagination items. */
export interface QuireMeasuredSourceCacheAdapter {
  /**
   * Reads cached measured items for a layout box.
   *
   * @param box - Layout box used as the identity key.
   * @returns Cached measured items, or undefined on a miss.
   */
  get(box: QuireLayoutBox): readonly QuireMeasuredContainerItem[] | undefined;

  /**
   * Stores measured items for a layout box.
   *
   * @param box - Layout box used as the identity key.
   * @param items - Measured items produced from the box.
   * @returns Nothing.
   */
  set(box: QuireLayoutBox, items: readonly QuireMeasuredContainerItem[]): void;

  /**
   * Reads a reusable measured prefix for a locally edited text box.
   *
   * @param box - Current text layout box.
   * @returns Reusable prefix items and suffix fragments, or undefined on fallback.
   */
  getTextPrefix?(
    box: QuireLayoutBox
  ): QuireMeasuredSourceTextPrefixReuse | undefined;

  /**
   * Stores the latest measured items for a text box.
   *
   * @param box - Current text layout box.
   * @param items - Measured items produced from the box.
   * @returns Nothing.
   */
  setTextBox?(box: QuireLayoutBox, items: readonly QuireMeasuredContainerItem[]): void;

  /**
   * Reads a reusable measured body prefix before the current dirty range.
   *
   * @param boxes - Current top-level layout boxes.
   * @param dirtyRange - Current changed document range.
   * @returns Reusable body prefix, or undefined on fallback.
   */
  getBodyPrefix?(
    boxes: readonly QuireLayoutBox[],
    dirtyRange: QuireLayoutBox["range"]
  ): QuireMeasuredSourceBodyPrefixReuse | undefined;

  /**
   * Reads a reusable measured body suffix after the current dirty range.
   *
   * @param boxes - Current top-level layout boxes.
   * @param startBoxIndex - First current top-level box to reuse.
   * @param previousBottom - Flow bottom before the suffix is appended.
   * @returns Reusable body suffix, or undefined on fallback.
   */
  getBodySuffix?(
    boxes: readonly QuireLayoutBox[],
    startBoxIndex: number,
    previousBottom: number | null
  ): QuireMeasuredSourceBodySuffixReuse | undefined;

  /**
   * Appends a reusable measured body suffix after the current dirty range.
   *
   * @param request - Current boxes, suffix start, flow state, and mutable targets.
   * @returns Append result, or undefined on fallback.
   */
  appendBodySuffix?(
    request: QuireMeasuredSourceBodySuffixAppendRequest
  ): QuireMeasuredSourceBodySuffixAppendResult | undefined;

  /**
   * Stores the latest measured body container for future prefix reuse.
   *
   * @param boxes - Top-level layout boxes used to build the body container.
   * @param container - Measured body container produced for those boxes.
   * @param spans - Body item spans owned by each top-level layout box.
   * @returns Nothing.
   */
  setBodyContainer?(
    boxes: readonly QuireLayoutBox[],
    container: QuireMeasuredContainer,
    spans: readonly QuireMeasuredSourceBodyBoxSpan[]
  ): void;
}

/**
 * Builds a measured body container from top-level layout boxes.
 *
 * A text block expands into one indivisible item per visual line, so the page
 * driver splits paragraphs at line boundaries (never mid-line). Renderer-neutral
 * recursive containers expand through the same child measured items, so provider
 * containers paginate without a node-name branch. A non-text leaf remains one
 * indivisible item measured by its rectangle height. See
 * `docs/research/canvas-pagination-algorithm.md`.
 *
 * @param boxes - Top-level layout boxes in document order.
 * @param measuredSourceCache - Optional cache for box-local measured item expansion.
 * @param dirtyRange - Optional changed document range used for body-prefix reuse.
 * @returns Measured container feeding the single pagination routine.
 */
export function buildQuireBodyMeasuredContainer(
  boxes: readonly QuireLayoutBox[],
  measuredSourceCache?: QuireMeasuredSourceCacheAdapter | undefined,
  dirtyRange?: QuireLayoutBox["range"] | null | undefined
): QuireMeasuredContainer {
  let items: QuireMeasuredContainerItem[] = [];
  let spans: QuireMeasuredSourceBodyBoxSpan[] = [];
  // Flow bottom of the previous item, so each item's leading gap (block margin or
  // line leading) is preserved; the routine collapses it at a page break.
  let previousBottom: number | null = null;
  let boxIndex = 0;
  let suffixReuseAttempted = false;

  if (dirtyRange !== undefined && dirtyRange !== null) {
    const prefixReuse = measuredSourceCache?.getBodyPrefix?.(boxes, dirtyRange);
    if (prefixReuse !== undefined && prefixReuse.boxCount > 0) {
      items = prefixReuse.items.slice(0, prefixReuse.itemEnd);
      spans = prefixReuse.spans.slice(0, prefixReuse.boxCount);
      previousBottom = prefixReuse.previousBottom;
      boxIndex = prefixReuse.boxCount;
    }
  }

  for (; boxIndex < boxes.length; boxIndex += 1) {
    const box = boxes[boxIndex]!;
    const itemStart = items.length;
    const boxItems = readQuireMeasuredItemsForBox(box, measuredSourceCache);
    previousBottom = appendQuireMeasuredBoxItems(items, boxItems, previousBottom);
    spans[boxIndex] = {
      itemStart,
      itemEnd: items.length
    };

    if (
      !suffixReuseAttempted &&
      dirtyRange !== undefined &&
      dirtyRange !== null
    ) {
      const nextBoxIndex = boxIndex + 1;
      const nextBox = boxes[nextBoxIndex];
      if (nextBox !== undefined && nextBox.range.from >= dirtyRange.to) {
        suffixReuseAttempted = true;
        if (measuredSourceCache?.appendBodySuffix !== undefined) {
          const appendedSuffix = measuredSourceCache.appendBodySuffix({
            boxes,
            startBoxIndex: nextBoxIndex,
            previousBottom,
            items,
            spans,
            spanIndexOffset: nextBoxIndex
          });

          if (appendedSuffix !== undefined && appendedSuffix.boxCount > 0) {
            previousBottom = appendedSuffix.previousBottom;
            boxIndex = nextBoxIndex + appendedSuffix.boxCount - 1;
          }
        } else {
          const suffixReuse = measuredSourceCache?.getBodySuffix?.(
            boxes,
            nextBoxIndex,
            previousBottom
          );

          if (suffixReuse !== undefined && suffixReuse.boxCount > 0) {
            const itemOffset = items.length;
            for (let index = 0; index < suffixReuse.items.length; index += 1) {
              items[itemOffset + index] = suffixReuse.items[index]!;
            }
            for (let index = 0; index < suffixReuse.boxCount; index += 1) {
              const span = suffixReuse.spans[index]!;
              spans[nextBoxIndex + index] = {
                itemStart: itemOffset + span.itemStart,
                itemEnd: itemOffset + span.itemEnd
              };
            }
            previousBottom = suffixReuse.previousBottom;
            boxIndex = nextBoxIndex + suffixReuse.boxCount - 1;
          }
        }
      }
    }
  }

  const container = {
    id: "body",
    range: {
      from: boxes[0]?.range.from ?? 0,
      to: boxes[boxes.length - 1]?.range.to ?? 0
    },
    items
  };
  measuredSourceCache?.setBodyContainer?.(boxes, container, spans);

  return container;
}

/**
 * Appends one box's measured items to the body container.
 *
 * Only the first item can receive an external sibling gap. The remaining
 * box-local items are already measured in flow order, so the caller only needs
 * the last defined flow bottom after the append.
 *
 * @param target - Mutable measured body item list.
 * @param boxItems - Box-local measured items to append.
 * @param previousBottom - Flow bottom before the box items are appended.
 * @returns Flow bottom after the appended items.
 */
function appendQuireMeasuredBoxItems(
  target: QuireMeasuredContainerItem[],
  boxItems: readonly QuireMeasuredContainerItem[],
  previousBottom: number | null
): number | null {
  if (boxItems.length === 0) {
    return previousBottom;
  }

  const firstItem = applyQuireExternalMeasuredSourceGap(
    boxItems[0]!,
    previousBottom
  );
  const targetStartIndex = target.length;
  target[targetStartIndex] = firstItem;

  for (let index = 1; index < boxItems.length; index += 1) {
    target[targetStartIndex + index] = boxItems[index]!;
  }

  return readQuireMeasuredItemsFlowBottom(boxItems, previousBottom);
}

/**
 * Reads cached measured items for a box or builds and stores them.
 *
 * @param box - Layout box to expand into pagination items.
 * @param measuredSourceCache - Optional measured-source cache.
 * @returns Box-local measured items.
 */
function readQuireMeasuredItemsForBox(
  box: QuireLayoutBox,
  measuredSourceCache: QuireMeasuredSourceCacheAdapter | undefined
): readonly QuireMeasuredContainerItem[] {
  const cached = measuredSourceCache?.get(box);

  if (cached !== undefined) {
    return cached;
  }

  const items = buildQuireMeasuredItemsForBox(
    box,
    measuredSourceCache?.getTextPrefix?.(box),
    measuredSourceCache
  );
  measuredSourceCache?.set(box, items);
  measuredSourceCache?.setTextBox?.(box, items);

  return items;
}

/**
 * Builds measured pagination items for one layout box.
 *
 * Items are box-local: the first item does not include the gap from the previous
 * sibling box. The container builder re-applies that external gap each pass so
 * cached items stay independent of neighboring boxes.
 *
 * @param box - Layout box to expand.
 * @param textPrefix - Optional reusable text-line prefix for this box.
 * @param measuredSourceCache - Optional cache used by recursive child boxes.
 * @returns Measured pagination items for the box.
 */
function buildQuireMeasuredItemsForBox(
  box: QuireLayoutBox,
  textPrefix?: QuireMeasuredSourceTextPrefixReuse | undefined,
  measuredSourceCache?: QuireMeasuredSourceCacheAdapter | undefined
): readonly QuireMeasuredContainerItem[] {
  const prefixItems = box.table ? [] : textPrefix?.items ?? [];
  const items: QuireMeasuredContainerItem[] = [];
  let previousBottom: number | null = null;

  for (let index = 0; index < prefixItems.length; index += 1) {
    items[index] = prefixItems[index]!;
  }
  previousBottom = readQuireMeasuredItemsFlowBottom(prefixItems, previousBottom);

  const pushItem: QuireMeasuredSourceItemSink = (
    id,
    range,
    top,
    bottom,
    itemOptions: QuireMeasuredSourceItemOptions = {}
  ) => {
    const gapBefore = previousBottom === null ? 0 : Math.max(0, top - previousBottom);
    items.push({
      id,
      range,
      flowTop: top,
      flowBottom: bottom,
      height: Math.max(0, bottom - top),
      canSplit: false,
      ...(gapBefore > 0 ? { gapBefore } : {}),
      // Preserve explicit false/zero metadata while leaving absent options absent.
      ...Object.fromEntries(Object.entries(itemOptions).filter(([, value]) => value !== undefined))
    });
    previousBottom = bottom;
  };

  if (box.table?.floating != null) {
    pushItem(
      box.id,
      box.range,
      box.rect.y,
      box.rect.y + Math.max(0, box.rect.height)
    );
    return items;
  }

  if (box.table && box.table.rows.length > 0) {
    pushQuireTableRowMeasuredItems({ box, pushItem });
    return items;
  }

  const lines = groupQuireTextFragmentsIntoLines(
    textPrefix?.suffixFragments ?? box.textFragments ?? []
  );

  if (lines.length > 0) {
    // Line ranges cover only the painted text; extend the first/last line to the
    // block's range bounds so the block's node-boundary positions stay inside a
    // page (the page range of a complete block equals the block's range). The
    // shared group enables widow/orphan control when the block splits across pages.
    const prefixLineCount = prefixItems.length;
    const pagination = box.pagination;
    const hasGroupPolicy = pagination?.keepTogether === true
      || pagination?.keepWithNext === true
      || pagination?.widows !== undefined
      || pagination?.orphans !== undefined;
    const group = prefixLineCount + lines.length > 1 || hasGroupPolicy
      ? box.id
      : undefined;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]!;
      const [top, bottom] = paragraphBorderLineEnvelope(
        box, line.top, line.bottom, prefixLineCount === 0 && index === 0, index === lines.length - 1
      );
      pushItem(
        `${box.id}:line:${prefixLineCount + index}`,
        {
          from: prefixLineCount === 0 && index === 0 ? box.range.from : line.from,
          to: index === lines.length - 1 ? box.range.to : line.to
        },
        top,
        bottom,
        {
          group,
          ...(line.breakAfter === undefined ? {} : { breakAfter: line.breakAfter }),
          ...(prefixLineCount === 0
            && index === 0
            && pagination?.breakBefore !== undefined
            ? { breakBefore: pagination.breakBefore }
            : {}),
          ...(pagination?.keepTogether === undefined
            ? {}
            : { keepTogether: pagination.keepTogether }),
          ...(pagination?.keepWithNext === undefined
            ? {}
            : { keepWithNext: pagination.keepWithNext }),
          ...(pagination?.widows === undefined
            ? {}
            : { groupWidows: pagination.widows }),
          ...(pagination?.orphans === undefined
            ? {}
            : { groupOrphans: pagination.orphans }),
          sourceFragments: [
            createQuireTextLineSourceFragment(box.id, line)
          ]
        }
      );
    }
    return items;
  }

  if (prefixItems.length > 0) {
    return items;
  }

  const children = readQuireLayoutBoxChildren(box);
  if (children.length > 0) {
    for (const child of children) {
      previousBottom = appendQuireMeasuredBoxItems(
        items,
        readQuireMeasuredItemsForBox(child, measuredSourceCache),
        previousBottom
      );
    }

    return extendQuireMeasuredItemsToContainerRange(items, box.range);
  }

  pushItem(
    box.id,
    box.range,
    box.rect.y,
    box.rect.y + box.rect.height,
    {
      ...(box.pagination?.breakBefore === undefined
        ? {}
        : { breakBefore: box.pagination.breakBefore }),
      ...(box.pagination?.keepTogether === undefined
        ? {}
        : { keepTogether: box.pagination.keepTogether }),
      ...(box.pagination?.keepWithNext === undefined
        ? {}
        : { keepWithNext: box.pagination.keepWithNext })
    }
  );

  return items;
}

/**
 * Extends the first and last recursive child items to the owning container range.
 *
 * Child boxes start inside their parent node. Carrying the outer boundary on the
 * edge items keeps page ranges and continuation positions source-complete without
 * inventing a separate container pagination item.
 *
 * @param items - Recursive child measured items in source order.
 * @param range - Owning renderer-neutral container range.
 * @returns Items whose outer boundaries cover the complete container source.
 */
function extendQuireMeasuredItemsToContainerRange(
  items: readonly QuireMeasuredContainerItem[],
  range: QuireLayoutBox["range"]
): readonly QuireMeasuredContainerItem[] {
  if (items.length === 0) {
    return items;
  }

  const result = [...items];
  const first = result[0]!;
  const lastIndex = result.length - 1;
  const last = result[lastIndex]!;

  if (first.range.from !== range.from) {
    result[0] = {
      ...first,
      range: { ...first.range, from: range.from }
    };
  }
  if (last.range.to !== range.to) {
    result[lastIndex] = {
      ...last,
      range: { ...last.range, to: range.to }
    };
  }

  return result;
}

/**
 * Applies the gap from the previous sibling box to the first item of a cached box.
 *
 * @param item - First measured item for the current box.
 * @param previousBottom - Flow bottom of the previously appended measured item.
 * @returns Original item when no external gap exists, otherwise a copy with gapBefore.
 */
function applyQuireExternalMeasuredSourceGap(
  item: QuireMeasuredContainerItem,
  previousBottom: number | null
): QuireMeasuredContainerItem {
  if (previousBottom === null || item.flowTop === undefined) {
    return item;
  }

  const gapBefore = Math.max(0, item.flowTop - previousBottom);

  if (gapBefore <= 0) {
    return item;
  }

  const combinedGapBefore = (item.gapBefore ?? 0) + gapBefore;
  if (item.gapBefore === combinedGapBefore) {
    return item;
  }

  const cached = externalMeasuredSourceGapStore.get(item);
  if (cached !== undefined && cached.gapBefore === combinedGapBefore) {
    return cached.item;
  }

  const adjusted = {
    ...item,
    gapBefore: combinedGapBefore
  };
  externalMeasuredSourceGapStore.set(item, {
    gapBefore: combinedGapBefore,
    item: adjusted
  });

  return adjusted;
}

/**
 * Reads the last defined flow bottom in a measured item run.
 *
 * @param items - Measured items that were just appended.
 * @param previousBottom - Previous flow bottom when no item carries one.
 * @returns Last defined flow bottom.
 */
function readQuireMeasuredItemsFlowBottom(
  items: readonly QuireMeasuredContainerItem[],
  previousBottom: number | null
): number | null {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    const flowBottom = items[index]?.flowBottom;
    if (flowBottom !== undefined) {
      return flowBottom;
    }
  }

  return previousBottom;
}
