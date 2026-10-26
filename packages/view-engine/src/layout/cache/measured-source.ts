import { textFragmentStylesEqual } from "./fragment-style";
import { minimumQuireMeasuredTextBoxEntries as minimumTextBoxEntries, resolveQuireMeasuredTextBoxBudget, trimQuireMeasuredTextBoxStore } from "./text-box-budget";
import type { QuireLayoutBox } from "../engine";
import { paragraphBorderMeasurementKey } from "../engine/pagination/measured-source/paragraph-borders";
import { readMaterializedQuireLayoutSignature } from "@quirekit/layout/block-flow";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerItem
} from "@quirekit/layout/pagination";
import type {
  QuireMeasuredSourceBodyBoxSpan,
  QuireMeasuredSourceBodySuffixAppendRequest,
  QuireMeasuredSourceBodySuffixAppendResult,
  QuireMeasuredSourceBodyPrefixReuse,
  QuireMeasuredSourceBodySuffixReuse,
  QuireMeasuredSourceCacheAdapter,
  QuireMeasuredSourceTextPrefixReuse
} from "../engine/pagination/measured-source";

/** Observable counters for one measured-source cache instance. */
export interface CanvasMeasuredSourceCacheCounters {
  /** Number of successful cache reads. */
  readonly hits: number;
  /** Number of successful cache reads served by exact layout box identity. */
  readonly exactHits: number;
  /** Number of successful cache reads served by shifted text-line items. */
  readonly shiftedTextHits: number;
  /** Number of successful cache reads served by shifted non-text leaf items. */
  readonly shiftedLeafHits: number;
  /** Number of cache reads that did not find a retained box entry. */
  readonly misses: number;
  /** Number of measured item arrays stored by the cache. */
  readonly stores: number;
  /** Number of successful text-line prefix reuse reads. */
  readonly textPrefixHits: number;
  /** Number of text-line prefix reuse reads that fell back to full measurement. */
  readonly textPrefixMisses: number;
  /** Number of measured text-line items retained through prefix reuse. */
  readonly textPrefixReusedItems: number;
  /** Number of successful measured body-prefix reuse reads. */
  readonly bodyPrefixHits: number;
  /** Number of measured body-prefix reuse reads that fell back to full scanning. */
  readonly bodyPrefixMisses: number;
  /** Number of measured body items retained through body-prefix reuse. */
  readonly bodyPrefixReusedItems: number;
  /** Number of successful measured body-suffix reuse reads. */
  readonly bodySuffixHits: number;
  /** Number of measured body-suffix reuse reads that fell back to full scanning. */
  readonly bodySuffixMisses: number;
  /** Number of measured body items retained through body-suffix reuse. */
  readonly bodySuffixReusedItems: number;
}

/** Last measured items for one text box id. */
interface CanvasMeasuredSourceTextBoxEntry {
  /** Non-collapsing border extents affecting first/last measured line height. */
  readonly borderMeasurementKey: string;
  /** Document range represented by the cached text box. */
  readonly range: QuireLayoutBox["range"];
  /** Rectangle represented by the cached text box. */
  readonly rect: QuireLayoutBox["rect"];
  /** Position-independent layout signature for fast shifted text reuse. */
  readonly layoutSignature?: string | undefined;
  /** Text fragments measured for the cached text box. */
  readonly fragments: readonly QuireTextFragment[];
  /** Box-local measured items produced from the cached fragments. */
  readonly items: readonly QuireMeasuredContainerItem[];
}

/** Last measured item for one non-text leaf box. */
interface CanvasMeasuredSourceLeafBoxEntry {
  /** Document range represented by the cached box. */
  readonly range: QuireLayoutBox["range"];
  /** Rectangle represented by the cached box. */
  readonly rect: QuireLayoutBox["rect"];
  /** Box-local measured item produced for the cached box. */
  readonly item: QuireMeasuredContainerItem;
}

/** Last measured body container retained for dirty-range prefix reuse. */
interface CanvasMeasuredSourceBodyEntry {
  /** Top-level layout boxes used to build the measured body container. */
  readonly boxes: readonly QuireLayoutBox[];
  /** Measured body container produced from those boxes. */
  readonly container: QuireMeasuredContainer;
  /** Body item spans owned by each top-level layout box. */
  readonly spans: readonly QuireMeasuredSourceBodyBoxSpan[];
}

/**
 * Per-layout-box cache for measured pagination items.
 *
 * The key is the `QuireLayoutBox` object identity. The block layout cache only
 * returns the same box object for unchanged inputs at identical geometry, so this
 * cache inherits that correctness boundary and avoids storing its own geometry
 * signature.
 */
export class CanvasMeasuredSourceCache implements QuireMeasuredSourceCacheAdapter {
  /** Backing store keyed by layout box object identity. */
  private store = new WeakMap<QuireLayoutBox, readonly QuireMeasuredContainerItem[]>();

  /** Last text-box measured entries keyed by stable layout box id. */
  private textBoxStore = new Map<string, CanvasMeasuredSourceTextBoxEntry>();

  /** Last single-item non-text leaf entries keyed by stable layout box id. */
  private leafBoxStore = new Map<string, CanvasMeasuredSourceLeafBoxEntry>();

  /** Last full body measured container for dirty-range prefix reuse. */
  private bodyStore: CanvasMeasuredSourceBodyEntry | undefined;

  /** Text-box entries kept after each body build; sized from that body. */
  private textBoxBudget = minimumTextBoxEntries;

  /** Successful cache read count. */
  private hits = 0;

  /** Successful exact identity cache read count. */
  private exactHits = 0;

  /** Successful shifted text-item cache read count. */
  private shiftedTextHits = 0;

  /** Successful shifted leaf-item cache read count. */
  private shiftedLeafHits = 0;

  /** Failed cache read count. */
  private misses = 0;

  /** Cache write count. */
  private stores = 0;

  /** Successful text-prefix reuse count. */
  private textPrefixHits = 0;

  /** Failed text-prefix reuse count. */
  private textPrefixMisses = 0;

  /** Number of measured line items retained by text-prefix reuse. */
  private textPrefixReusedItems = 0;

  /** Successful body-prefix reuse count. */
  private bodyPrefixHits = 0;

  /** Failed body-prefix reuse count. */
  private bodyPrefixMisses = 0;

  /** Number of body measured items retained by body-prefix reuse. */
  private bodyPrefixReusedItems = 0;

  /** Successful body-suffix reuse count. */
  private bodySuffixHits = 0;

  /** Failed body-suffix reuse count. */
  private bodySuffixMisses = 0;

  /** Number of body measured items retained by body-suffix reuse. */
  private bodySuffixReusedItems = 0;

  /**
   * Reads cached measured items for a layout box.
   *
   * @param box - Layout box used as the identity key.
   * @returns Cached measured items, or undefined on a miss.
   */
  get(box: QuireLayoutBox): readonly QuireMeasuredContainerItem[] | undefined {
    const entry = this.store.get(box);

    if (entry !== undefined) {
      this.hits += 1;
      this.exactHits += 1;
      return entry;
    }

    const shiftedText = this.getShiftedTextBoxItems(box);
    if (shiftedText !== undefined) {
      this.store.set(box, shiftedText);
      this.hits += 1;
      this.shiftedTextHits += 1;
      return shiftedText;
    }

    const shifted = this.getShiftedLeafBoxItems(box);
    if (shifted !== undefined) {
      this.store.set(box, shifted);
      this.setLeafBox(box, shifted);
      this.hits += 1;
      this.shiftedLeafHits += 1;
      return shifted;
    }

    this.misses += 1;
    return undefined;
  }

  /**
   * Stores measured items for a layout box.
   *
   * @param box - Layout box used as the identity key.
   * @param items - Measured items produced from the box.
   * @returns Nothing.
   */
  set(box: QuireLayoutBox, items: readonly QuireMeasuredContainerItem[]): void {
    this.store.set(box, items);
    this.setLeafBox(box, items);
    this.stores += 1;
  }

  /**
   * Reads measured prefix items that are still valid for a locally edited text box.
   *
   * @param box - Current text layout box.
   * @returns Reusable prefix items and suffix fragments, or undefined on fallback.
   */
  getTextPrefix(box: QuireLayoutBox): QuireMeasuredSourceTextPrefixReuse | undefined {
    const currentFragments = box.textFragments;
    if (
      box.table !== undefined ||
      currentFragments === undefined ||
      currentFragments.length === 0
    ) {
      return undefined;
    }

    const entry = this.textBoxStore.get(box.id);
    if (
      entry === undefined ||
      entry.borderMeasurementKey !== paragraphBorderMeasurementKey(box) ||
      entry.fragments.length === 0 ||
      entry.items.length === 0
    ) {
      return this.recordTextPrefixMiss();
    }

    const shiftedReuse = createShiftedMeasuredTextReuse(box, entry, currentFragments);
    if (shiftedReuse !== undefined) {
      this.textPrefixHits += 1;
      this.textPrefixReusedItems += shiftedReuse.items.length;
      return shiftedReuse;
    }

    if (entry.range.from !== box.range.from) {
      return this.recordTextPrefixMiss();
    }

    const matchingFragmentCount = countMatchingTextFragmentPrefix(
      entry.fragments,
      currentFragments
    );
    if (matchingFragmentCount === 0) {
      return this.recordTextPrefixMiss();
    }

    const reuse = createMeasuredTextPrefixReuse({
      box,
      entry,
      currentFragments,
      matchingFragmentCount
    });

    if (reuse === undefined) {
      return this.recordTextPrefixMiss();
    }

    this.textPrefixHits += 1;
    this.textPrefixReusedItems += reuse.items.length;

    return reuse;
  }

  /**
   * Stores the latest measured items for a cacheable text box.
   *
   * @param box - Current text layout box.
   * @param items - Measured items produced from the box.
   * @returns Nothing.
   */
  setTextBox(box: QuireLayoutBox, items: readonly QuireMeasuredContainerItem[]): void {
    const fragments = box.textFragments;
    if (
      box.table !== undefined ||
      fragments === undefined ||
      fragments.length === 0 ||
      items.length === 0
    ) {
      return;
    }

    // Body builds trim to the budget; this bound covers stores made without one.
    if (!this.textBoxStore.has(box.id) && this.textBoxStore.size >= this.textBoxBudget * 4) {
      trimQuireMeasuredTextBoxStore(this.textBoxStore, this.textBoxBudget);
    }

    const layoutSignature = readMaterializedQuireLayoutSignature(box);
    this.textBoxStore.set(box.id, {
      borderMeasurementKey: paragraphBorderMeasurementKey(box),
      range: box.range,
      rect: box.rect,
      ...(layoutSignature === undefined ? {} : { layoutSignature }),
      fragments,
      items
    });
  }

  /**
   * Reads a measured body prefix before the current dirty range.
   *
   * @param boxes - Current top-level layout boxes.
   * @param dirtyRange - Current changed document range.
   * @returns Reusable body prefix, or undefined on fallback.
   */
  getBodyPrefix(
    boxes: readonly QuireLayoutBox[],
    dirtyRange: QuireLayoutBox["range"]
  ): QuireMeasuredSourceBodyPrefixReuse | undefined {
    const entry = this.bodyStore;
    if (entry === undefined || boxes.length === 0) {
      return this.recordBodyPrefixMiss();
    }

    let boxCount = 0;
    while (boxCount < boxes.length) {
      const currentBox = boxes[boxCount];
      const previousBox = entry.boxes[boxCount];
      const span = entry.spans[boxCount];

      if (
        currentBox === undefined ||
        previousBox === undefined ||
        span === undefined ||
        currentBox !== previousBox ||
        currentBox.range.to > dirtyRange.from
      ) {
        break;
      }

      boxCount += 1;
    }

    if (boxCount === 0) {
      return this.recordBodyPrefixMiss();
    }

    const itemEnd = entry.spans[boxCount - 1]?.itemEnd ?? 0;
    const lastItem = entry.container.items[itemEnd - 1];
    this.bodyPrefixHits += 1;
    this.bodyPrefixReusedItems += itemEnd;

    return {
      items: entry.container.items,
      itemEnd,
      spans: entry.spans.slice(0, boxCount),
      boxCount,
      previousBottom: lastItem?.flowBottom ?? null
    };
  }

  /**
   * Reads a measured body suffix after the current dirty range.
   *
   * @param boxes - Current top-level layout boxes.
   * @param startBoxIndex - First current top-level box to reuse.
   * @param previousBottom - Flow bottom before the suffix is appended.
   * @returns Reusable body suffix, or undefined on fallback.
   */
  getBodySuffix(
    boxes: readonly QuireLayoutBox[],
    startBoxIndex: number,
    previousBottom: number | null
  ): QuireMeasuredSourceBodySuffixReuse | undefined {
    const items: QuireMeasuredContainerItem[] = [];
    const spans: QuireMeasuredSourceBodyBoxSpan[] = [];
    const result = this.appendBodySuffix({
      boxes,
      startBoxIndex,
      previousBottom,
      items,
      spans,
      spanIndexOffset: 0
    });

    if (result === undefined) {
      return undefined;
    }

    return {
      items,
      spans,
      boxCount: result.boxCount,
      previousBottom: result.previousBottom
    };
  }

  /**
   * Appends a measured body suffix directly into the caller's target arrays.
   *
   * @param request - Current boxes, suffix start, flow state, and mutable targets.
   * @returns Append result, or undefined on fallback.
   */
  appendBodySuffix(
    request: QuireMeasuredSourceBodySuffixAppendRequest
  ): QuireMeasuredSourceBodySuffixAppendResult | undefined {
    const entry = this.bodyStore;
    const {
      boxes,
      startBoxIndex,
      previousBottom,
      items,
      spans,
      spanIndexOffset
    } = request;
    if (
      entry === undefined ||
      boxes.length === 0 ||
      startBoxIndex < 0 ||
      startBoxIndex >= boxes.length
    ) {
      return this.recordBodySuffixMiss();
    }

    const initialItemLength = items.length;
    let boxCount = 0;
    let retainedPreviousBottom = previousBottom;
    let commonRangeDelta: number | undefined;
    let commonDy: number | undefined;

    for (let index = startBoxIndex; index < boxes.length; index += 1) {
      const currentBox = boxes[index];
      const previousBox = entry.boxes[index];
      const previousSpan = entry.spans[index];

      if (
        currentBox === undefined ||
        previousBox === undefined ||
        previousSpan === undefined
      ) {
        break;
      }

      const itemStart = items.length;
      const shifted = appendShiftedMeasuredBodyBoxItems(
        currentBox,
        previousBox,
        entry.container.items,
        previousSpan,
        items,
        retainedPreviousBottom
      );

      if (shifted === undefined) {
        break;
      }

      if (
        (commonRangeDelta !== undefined && shifted.rangeDelta !== commonRangeDelta) ||
        (commonDy !== undefined && shifted.dy !== commonDy)
      ) {
        items.length = itemStart;
        break;
      }

      commonRangeDelta = shifted.rangeDelta;
      commonDy = shifted.dy;
      retainedPreviousBottom = shifted.previousBottom;
      spans[spanIndexOffset + boxCount] = {
        itemStart,
        itemEnd: shifted.itemEnd
      };
      boxCount += 1;
    }

    if (boxCount === 0) {
      items.length = initialItemLength;
      return this.recordBodySuffixMiss();
    }

    this.bodySuffixHits += 1;
    this.bodySuffixReusedItems += items.length - initialItemLength;

    return {
      boxCount,
      previousBottom: retainedPreviousBottom
    };
  }

  /**
   * Stores the latest measured body container for future prefix reuse.
   *
   * @param boxes - Top-level layout boxes used to build the measured body.
   * @param container - Measured body container produced from the boxes.
   * @param spans - Body item spans owned by each top-level layout box.
   * @returns Nothing.
   */
  setBodyContainer(
    boxes: readonly QuireLayoutBox[],
    container: QuireMeasuredContainer,
    spans: readonly QuireMeasuredSourceBodyBoxSpan[]
  ): void {
    this.bodyStore = {
      boxes: boxes.slice(),
      container,
      spans: spans.slice()
    };
    this.textBoxBudget = resolveQuireMeasuredTextBoxBudget(container.items.length);
    trimQuireMeasuredTextBoxStore(this.textBoxStore, this.textBoxBudget);
  }

  /**
   * Returns the current observable cache counters.
   *
   * @returns Cache hit, miss, and store counters.
   */
  snapshot(): CanvasMeasuredSourceCacheCounters {
    return {
      hits: this.hits,
      exactHits: this.exactHits,
      shiftedTextHits: this.shiftedTextHits,
      shiftedLeafHits: this.shiftedLeafHits,
      misses: this.misses,
      stores: this.stores,
      textPrefixHits: this.textPrefixHits,
      textPrefixMisses: this.textPrefixMisses,
      textPrefixReusedItems: this.textPrefixReusedItems,
      bodyPrefixHits: this.bodyPrefixHits,
      bodyPrefixMisses: this.bodyPrefixMisses,
      bodyPrefixReusedItems: this.bodyPrefixReusedItems,
      bodySuffixHits: this.bodySuffixHits,
      bodySuffixMisses: this.bodySuffixMisses,
      bodySuffixReusedItems: this.bodySuffixReusedItems
    };
  }

  /**
   * Drops every cached measured item array and resets counters.
   *
   * @returns Nothing.
   */
  clear(): void {
    this.store = new WeakMap();
    this.textBoxStore = new Map();
    this.leafBoxStore = new Map();
    this.bodyStore = undefined;
    this.hits = 0;
    this.exactHits = 0;
    this.shiftedTextHits = 0;
    this.shiftedLeafHits = 0;
    this.misses = 0;
    this.stores = 0;
    this.textPrefixHits = 0;
    this.textPrefixMisses = 0;
    this.textPrefixReusedItems = 0;
    this.bodyPrefixHits = 0;
    this.bodyPrefixMisses = 0;
    this.bodyPrefixReusedItems = 0;
    this.bodySuffixHits = 0;
    this.bodySuffixMisses = 0;
    this.bodySuffixReusedItems = 0;
  }

  /**
   * Records a failed text-prefix reuse attempt.
   *
   * @returns Undefined so callers can return the fallback marker directly.
   */
  private recordTextPrefixMiss(): undefined {
    this.textPrefixMisses += 1;

    return undefined;
  }

  /**
   * Records a failed body-prefix reuse attempt.
   *
   * @returns Undefined so callers can return the fallback marker directly.
   */
  private recordBodyPrefixMiss(): undefined {
    this.bodyPrefixMisses += 1;

    return undefined;
  }

  /**
   * Records a failed body-suffix reuse attempt.
   *
   * @returns Undefined so callers can return the fallback marker directly.
   */
  private recordBodySuffixMiss(): undefined {
    this.bodySuffixMisses += 1;

    return undefined;
  }

  /**
   * Reads shifted measured items for an unchanged text box without touching fragments.
   *
   * @param box - Current layout box.
   * @returns Shifted measured text-line items, or undefined when reuse is unsafe.
   */
  private getShiftedTextBoxItems(
    box: QuireLayoutBox
  ): readonly QuireMeasuredContainerItem[] | undefined {
    const entry = this.textBoxStore.get(box.id);
    if (
      entry === undefined ||
      entry.borderMeasurementKey !== paragraphBorderMeasurementKey(box) ||
      entry.items.length === 0 ||
      entry.range.to - entry.range.from !== box.range.to - box.range.from ||
      entry.rect.x !== box.rect.x ||
      entry.rect.width !== box.rect.width ||
      entry.rect.height !== box.rect.height
    ) {
      return undefined;
    }
    const layoutSignature = box.layoutSignature;
    if (
      layoutSignature === undefined ||
      entry.layoutSignature !== layoutSignature
    ) {
      return undefined;
    }

    const rangeShift = box.range.from - entry.range.from;
    const dy = box.rect.y - entry.rect.y;
    if (rangeShift === 0 && dy === 0) {
      return entry.items;
    }

    const items = new Array<QuireMeasuredContainerItem>(entry.items.length);
    for (let index = 0; index < entry.items.length; index += 1) {
      const item = entry.items[index]!;
      const shiftedItem = shiftMeasuredTextLineItem(item, box.id, rangeShift, dy);

      if (shiftedItem === undefined) {
        return undefined;
      }
      items[index] = shiftedItem;
    }

    return items;
  }

  /**
   * Reads a shifted measured item for an unchanged non-text leaf box.
   *
   * @param box - Current layout box.
   * @returns Shifted measured item array, or undefined when reuse is unsafe.
   */
  private getShiftedLeafBoxItems(
    box: QuireLayoutBox
  ): readonly QuireMeasuredContainerItem[] | undefined {
    if (!isShiftableMeasuredLeafBox(box)) {
      return undefined;
    }

    const entry = this.leafBoxStore.get(box.id);
    if (
      entry === undefined ||
      entry.rect.x !== box.rect.x ||
      entry.rect.width !== box.rect.width ||
      entry.rect.height !== box.rect.height ||
      entry.range.to - entry.range.from !== box.range.to - box.range.from
    ) {
      return undefined;
    }

    const dy = box.rect.y - entry.rect.y;
    const rangeDelta = box.range.from - entry.range.from;
    if (dy === 0 && rangeDelta === 0) {
      return [entry.item];
    }

    return [shiftMeasuredLeafItem(entry.item, box, dy, rangeDelta)];
  }

  /**
   * Stores a measured item for future non-text leaf box shift reuse.
   *
   * @param box - Current layout box.
   * @param items - Measured item array produced for the box.
   * @returns Nothing.
   */
  private setLeafBox(
    box: QuireLayoutBox,
    items: readonly QuireMeasuredContainerItem[]
  ): void {
    if (!isShiftableMeasuredLeafBox(box) || items.length !== 1) {
      this.leafBoxStore.delete(box.id);
      return;
    }

    this.leafBoxStore.set(box.id, {
      range: box.range,
      rect: box.rect,
      item: items[0]!
    });
  }
}

/** Result of appending one shifted body-box item run to a suffix target. */
interface AppendedShiftedMeasuredBodyBoxItems {
  /** Document-position delta from the previous box to the current box. */
  readonly rangeDelta: number;
  /** Source-flow y delta from the previous box to the current box. */
  readonly dy: number;
  /** Exclusive target item index after the shifted box items. */
  readonly itemEnd: number;
  /** Flow bottom after the shifted box items. */
  readonly previousBottom: number | null;
}

/**
 * Appends one previous body-box item run shifted to the current top-level box.
 *
 * @param currentBox - Current top-level layout box.
 * @param previousBox - Previous top-level layout box at the same document-order index.
 * @param previousItems - Previous measured body container items.
 * @param previousSpan - Previous body item span owned by the previous box.
 * @param target - Mutable suffix item array receiving shifted items.
 * @param previousBottom - Flow bottom before the shifted items are appended.
 * @returns Append result, or undefined when reuse is unsafe.
 */
function appendShiftedMeasuredBodyBoxItems(
  currentBox: QuireLayoutBox,
  previousBox: QuireLayoutBox,
  previousItems: readonly QuireMeasuredContainerItem[],
  previousSpan: QuireMeasuredSourceBodyBoxSpan,
  target: QuireMeasuredContainerItem[],
  previousBottom: number | null
): AppendedShiftedMeasuredBodyBoxItems | undefined {
  const previousItemCount = previousSpan.itemEnd - previousSpan.itemStart;
  if (
    currentBox.id !== previousBox.id ||
    previousItemCount <= 0 ||
    previousSpan.itemStart < 0 ||
    previousSpan.itemEnd > previousItems.length ||
    !areMeasuredBodyBoxesShiftCompatible(currentBox, previousBox)
  ) {
    return undefined;
  }

  const rangeDelta = currentBox.range.from - previousBox.range.from;
  const dy = currentBox.rect.y - previousBox.rect.y;
  const itemStart = target.length;
  const textResult = appendShiftedMeasuredBodyTextItems(
    currentBox,
    previousBox,
    previousItems,
    previousSpan,
    target,
    rangeDelta,
    dy,
    previousBottom
  );

  if (textResult !== undefined) {
    return {
      rangeDelta,
      dy,
      itemEnd: textResult.itemEnd,
      previousBottom: textResult.previousBottom
    };
  }

  if (!appendShiftedMeasuredBodyLeafItem({
    currentBox,
    previousBox,
    previousItems,
    previousSpan,
    target,
    rangeDelta,
    dy,
    previousBottom
  })) {
    target.length = itemStart;
    return undefined;
  }

  return {
    rangeDelta,
    dy,
    itemEnd: target.length,
    previousBottom: target[target.length - 1]?.flowBottom ?? previousBottom
  };
}

/** Result of appending shifted body items. */
interface ShiftedMeasuredBodyAppendResult {
  /** Exclusive target item index after the appended items. */
  readonly itemEnd: number;
  /** Flow bottom after the appended items. */
  readonly previousBottom: number | null;
}

/**
 * Appends previous text-line body items shifted to the current text box.
 *
 * @param currentBox - Current top-level text box.
 * @param previousBox - Previous top-level text box.
 * @param previousItems - Previous measured body container items.
 * @param previousSpan - Previous body item span owned by the previous box.
 * @param target - Mutable suffix item array receiving shifted items.
 * @param rangeDelta - Document-position delta to apply.
 * @param dy - Source-flow y delta to apply.
 * @param previousBottom - Flow bottom before the shifted items are appended.
 * @returns Append result, or undefined when any item is not reusable.
 */
function appendShiftedMeasuredBodyTextItems(
  currentBox: QuireLayoutBox,
  previousBox: QuireLayoutBox,
  previousItems: readonly QuireMeasuredContainerItem[],
  previousSpan: QuireMeasuredSourceBodyBoxSpan,
  target: QuireMeasuredContainerItem[],
  rangeDelta: number,
  dy: number,
  previousBottom: number | null
): ShiftedMeasuredBodyAppendResult | undefined {
  if (
    currentBox.table !== undefined ||
    previousBox.table !== undefined ||
    currentBox.layoutSignature === undefined ||
    currentBox.layoutSignature !== previousBox.layoutSignature
  ) {
    return undefined;
  }

  const itemStart = target.length;
  let retainedPreviousBottom = previousBottom;

  for (let index = previousSpan.itemStart; index < previousSpan.itemEnd; index += 1) {
    const shifted = shiftMeasuredTextLineItem(
      previousItems[index]!,
      currentBox.id,
      rangeDelta,
      dy
    );

    if (shifted === undefined) {
      target.length = itemStart;
      return undefined;
    }

    if (
      index === previousSpan.itemStart &&
      !isMeasuredBodySuffixGapCompatible(shifted, retainedPreviousBottom)
    ) {
      target.length = itemStart;
      return undefined;
    }

    target[target.length] = shifted;
    retainedPreviousBottom = shifted.flowBottom ?? retainedPreviousBottom;
  }

  return {
    itemEnd: target.length,
    previousBottom: retainedPreviousBottom
  };
}

/**
 * Appends a previous leaf body item shifted to the current leaf box.
 *
 * @param options - Current/previous boxes, source span, target, deltas, and flow state.
 * @returns Whether the leaf item was safely appended.
 */
function appendShiftedMeasuredBodyLeafItem(options: {
  /** Current top-level leaf box. */
  readonly currentBox: QuireLayoutBox;
  /** Previous top-level leaf box. */
  readonly previousBox: QuireLayoutBox;
  /** Previous measured body container items. */
  readonly previousItems: readonly QuireMeasuredContainerItem[];
  /** Previous body item span owned by the previous box. */
  readonly previousSpan: QuireMeasuredSourceBodyBoxSpan;
  /** Mutable suffix item array receiving the shifted item. */
  readonly target: QuireMeasuredContainerItem[];
  /** Document-position delta to apply. */
  readonly rangeDelta: number;
  /** Source-flow y delta to apply. */
  readonly dy: number;
  /** Flow bottom before the shifted item is appended. */
  readonly previousBottom: number | null;
}): boolean {
  const {
    currentBox,
    previousBox,
    previousItems,
    previousSpan,
    target,
    rangeDelta,
    dy,
    previousBottom
  } = options;

  if (
    !isShiftableMeasuredLeafBox(currentBox) ||
    !isShiftableMeasuredLeafBox(previousBox) ||
    previousSpan.itemEnd - previousSpan.itemStart !== 1
  ) {
    return false;
  }

  const shifted = shiftMeasuredLeafItem(
    previousItems[previousSpan.itemStart]!,
    currentBox,
    dy,
    rangeDelta
  );

  if (!isMeasuredBodySuffixGapCompatible(shifted, previousBottom)) {
    return false;
  }

  target[target.length] = shifted;

  return true;
}

/**
 * Checks whether two body boxes differ only by source-flow and range translation.
 *
 * @param currentBox - Current top-level layout box.
 * @param previousBox - Previous top-level layout box.
 * @returns Whether measured body items can be shifted without remeasurement.
 */
function areMeasuredBodyBoxesShiftCompatible(
  currentBox: QuireLayoutBox,
  previousBox: QuireLayoutBox
): boolean {
  return (
    currentBox.range.to - currentBox.range.from ===
      previousBox.range.to - previousBox.range.from &&
    areNumbersEqual(currentBox.rect.x, previousBox.rect.x) &&
    areNumbersEqual(currentBox.rect.width, previousBox.rect.width) &&
    areNumbersEqual(currentBox.rect.height, previousBox.rect.height)
  );
}

/**
 * Checks whether the first shifted suffix item still joins the rebuilt prefix.
 *
 * @param items - Shifted suffix body items for one top-level box.
 * @param previousBottom - Flow bottom immediately before the suffix.
 * @returns Whether the shifted item's retained gap matches the current prefix.
 */
function isMeasuredBodySuffixGapCompatible(
  item: QuireMeasuredContainerItem,
  previousBottom: number | null
): boolean {
  const expectedGap =
    previousBottom === null || item.flowTop === undefined
      ? 0
      : Math.max(0, item.flowTop - previousBottom);

  return areNumbersEqual(item.gapBefore ?? 0, expectedGap);
}

/**
 * Compares layout numbers with a tiny tolerance for shaped sub-pixel values.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Whether the values should be treated as equal.
 */
function areNumbersEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.001;
}

/**
 * Checks whether a layout box can reuse a single measured item by shifting.
 *
 * @param box - Candidate layout box.
 * @returns Whether the box has no nested, table, or text-line measurement.
 */
function isShiftableMeasuredLeafBox(box: QuireLayoutBox): boolean {
  return (
    box.table === undefined &&
    (box.textFragments === undefined || box.textFragments.length === 0) &&
    !("children" in box)
  );
}

/**
 * Shifts a single measured leaf item to the current box position.
 *
 * @param item - Retained measured item.
 * @param box - Current layout box.
 * @param dy - Source-flow y delta.
 * @param rangeDelta - Document range delta.
 * @returns Shifted measured item.
 */
function shiftMeasuredLeafItem(
  item: QuireMeasuredContainerItem,
  box: QuireLayoutBox,
  dy: number,
  rangeDelta: number
): QuireMeasuredContainerItem {
  return {
    ...item,
    id: box.id,
    range: shiftDocumentRange(item.range, rangeDelta),
    ...(item.flowTop === undefined ? {} : { flowTop: item.flowTop + dy }),
    ...(item.flowBottom === undefined ? {} : { flowBottom: item.flowBottom + dy })
  };
}

/**
 * Builds reusable items when an unchanged text box only shifted document ranges.
 *
 * @param box - Current text layout box.
 * @param entry - Previous measured text-box entry.
 * @param currentFragments - Current text fragments owned by the box.
 * @returns Shifted measured items, or undefined when any item is unsafe to reuse.
 */
function createShiftedMeasuredTextReuse(
  box: QuireLayoutBox,
  entry: CanvasMeasuredSourceTextBoxEntry,
  currentFragments: readonly QuireTextFragment[]
): QuireMeasuredSourceTextPrefixReuse | undefined {
  const rangeShift = box.range.from - entry.range.from;

  if (
    rangeShift === 0 ||
    entry.range.to - entry.range.from !== box.range.to - box.range.from ||
    !areTextFragmentRangesShifted(entry.fragments, currentFragments, rangeShift)
  ) {
    return undefined;
  }

  const items = new Array<QuireMeasuredContainerItem>(entry.items.length);
  for (let index = 0; index < entry.items.length; index += 1) {
    const item = entry.items[index]!;
    const shiftedItem = shiftMeasuredTextLineItem(item, box.id, rangeShift, 0);

    if (shiftedItem === undefined) {
      return undefined;
    }
    items[index] = shiftedItem;
  }

  return {
    items,
    suffixFragments: []
  };
}

/**
 * Builds a reusable prefix from a previous text-box measured entry.
 *
 * @param options - Current box, previous entry, current fragments, and prefix length.
 * @returns Reusable prefix and suffix fragments, or undefined when unsafe.
 */
function createMeasuredTextPrefixReuse(options: {
  readonly box: QuireLayoutBox;
  readonly entry: CanvasMeasuredSourceTextBoxEntry;
  readonly currentFragments: readonly QuireTextFragment[];
  readonly matchingFragmentCount: number;
}): QuireMeasuredSourceTextPrefixReuse | undefined {
  const { box, entry, currentFragments, matchingFragmentCount } = options;
  const retainedBoundary = entry.fragments[matchingFragmentCount - 1]?.range.to;
  const currentLastBoundary = currentFragments[currentFragments.length - 1]?.range.to;

  if (
    retainedBoundary === undefined ||
    currentLastBoundary === undefined
  ) {
    return undefined;
  }

  const reusedItems: QuireMeasuredContainerItem[] = [];
  let reusedBoundary: number | undefined;

  for (let index = 0; index < entry.items.length; index += 1) {
    const item = entry.items[index]!;

    if (entry.range.to !== box.range.to && index === entry.items.length - 1) {
      break;
    }

    const source = readReusableTextLineSource(item, box.id);
    if (source === undefined || source.range.to > retainedBoundary) {
      break;
    }

    if (entry.range.to !== box.range.to && source.range.to >= currentLastBoundary) {
      break;
    }

    reusedItems.push(item);
    reusedBoundary = source.range.to;
  }

  if (reusedItems.length === 0 || reusedBoundary === undefined) {
    return undefined;
  }

  const suffixStartIndex = findTextSuffixStartIndex(currentFragments, reusedBoundary);
  const suffixFragments = currentFragments.slice(suffixStartIndex);

  if (suffixFragments.length === 0 && entry.range.to !== box.range.to) {
    return undefined;
  }

  return {
    items: reusedItems,
    suffixFragments
  };
}

/**
 * Counts matching text fragment signatures from the start of two arrays.
 *
 * @param previous - Previous measured text fragments.
 * @param current - Current measured text fragments.
 * @returns Number of leading fragments with equivalent measured signatures.
 */
function countMatchingTextFragmentPrefix(
  previous: readonly QuireTextFragment[],
  current: readonly QuireTextFragment[]
): number {
  const count = Math.min(previous.length, current.length);
  for (let index = 0; index < count; index += 1) {
    const previousFragment = previous[index];
    const currentFragment = current[index];

    if (
      previousFragment === undefined ||
      currentFragment === undefined ||
      !areShiftedTextFragmentSignaturesEqual(previousFragment, currentFragment, 0)
    ) {
      return index;
    }
  }

  return count;
}

/**
 * Checks whether current fragments are identical except for document positions.
 *
 * @param previous - Previous text fragments.
 * @param current - Current text fragments.
 * @param rangeShift - Document-position delta from previous to current.
 * @returns Whether the fragments can reuse measured text-line items by shifting ranges.
 */
function areTextFragmentRangesShifted(
  previous: readonly QuireTextFragment[],
  current: readonly QuireTextFragment[],
  rangeShift: number
): boolean {
  if (previous.length !== current.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const previousFragment = previous[index]!;
    const currentFragment = current[index];

    if (
      currentFragment === undefined ||
      !areShiftedTextFragmentSignaturesEqual(
        previousFragment,
        currentFragment,
        rangeShift
      )
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Checks whether two fragments differ only by document range translation.
 *
 * @param previous - Previous fragment.
 * @param current - Current fragment.
 * @param rangeShift - Document-position delta from previous to current.
 * @returns Whether the fragments have equivalent measured geometry and shifted ranges.
 */
function areShiftedTextFragmentSignaturesEqual(
  previous: QuireTextFragment,
  current: QuireTextFragment,
  rangeShift: number
): boolean {
  return (
    previous.id === current.id &&
    previous.text === current.text &&
    textFragmentStylesEqual(previous, current) &&
    previous.range.from + rangeShift === current.range.from &&
    previous.range.to + rangeShift === current.range.to &&
    previous.rect.x === current.rect.x &&
    previous.rect.y === current.rect.y &&
    previous.rect.width === current.rect.width &&
    previous.rect.height === current.rect.height &&
    previous.baseline === current.baseline
  );
}

/**
 * Shifts a cached measured text-line item to a new document position.
 *
 * @param item - Cached measured item.
 * @param ownerId - Current text box id that must own the source.
 * @param rangeShift - Document-position delta to apply.
 * @param dy - Source-flow y delta to apply.
 * @returns Shifted item, or undefined when the item provenance is not reusable.
 */
function shiftMeasuredTextLineItem(
  item: QuireMeasuredContainerItem,
  ownerId: string,
  rangeShift: number,
  dy: number
): QuireMeasuredContainerItem | undefined {
  const source = readReusableTextLineSource(item, ownerId);

  if (source === undefined) {
    return undefined;
  }

  const shiftedSource = {
    ...source,
    range: shiftDocumentRange(source.range, rangeShift),
    flowTop: source.flowTop + dy,
    flowBottom: source.flowBottom + dy
  };

  return {
    ...item,
    range: shiftDocumentRange(item.range, rangeShift),
    ...(item.flowTop === undefined ? {} : { flowTop: item.flowTop + dy }),
    ...(item.flowBottom === undefined ? {} : { flowBottom: item.flowBottom + dy }),
    sourceFragments: [shiftedSource]
  };
}

/**
 * Shifts a document range by a fixed delta.
 *
 * @param range - Original document range.
 * @param delta - Position delta to apply.
 * @returns Shifted document range.
 */
function shiftDocumentRange(
  range: QuireLayoutBox["range"],
  delta: number
): QuireLayoutBox["range"] {
  return {
    from: range.from + delta,
    to: range.to + delta
  };
}

/**
 * Reads the text-line source fragment required for safe prefix reuse.
 *
 * @param item - Cached measured item.
 * @param ownerId - Current text box id that must own the source.
 * @returns Text-line source fragment, or undefined when the item is not reusable.
 */
function readReusableTextLineSource(
  item: QuireMeasuredContainerItem,
  ownerId: string
): NonNullable<QuireMeasuredContainerItem["sourceFragments"]>[number] | undefined {
  const source = item.sourceFragments?.[0];

  if (
    source === undefined ||
    item.sourceFragments?.length !== 1 ||
    source.kind !== "textLine" ||
    source.ownerId !== ownerId
  ) {
    return undefined;
  }

  return source;
}

/**
 * Finds the first fragment that belongs to the unmeasured suffix.
 *
 * @param fragments - Current text fragments.
 * @param reusedBoundary - Document position after the last reused line.
 * @returns Start index for suffix measurement.
 */
function findTextSuffixStartIndex(
  fragments: readonly QuireTextFragment[],
  reusedBoundary: number
): number {
  for (let index = 0; index < fragments.length; index += 1) {
    if (fragments[index]!.range.to > reusedBoundary) {
      return index;
    }
  }

  return fragments.length;
}


/**
 * Creates an empty measured-source cache.
 *
 * @returns Measured-source cache ready for a mounted view or test.
 */
export function createQuireMeasuredSourceCache(): CanvasMeasuredSourceCache {
  return new CanvasMeasuredSourceCache();
}
