import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageEndInfo } from "../types";
import {
  createCollapsedQuireRange,
  clampQuireMeasuredContainerStartIndex,
  extendQuireMeasuredContainerRange
} from "./range";
import { mergeQuireMeasuredContainerEndInfo } from "./end-info";
import { shouldSpillBeforeQuireMeasuredGroup } from "./group-policy";
import { addQuireItemNotes, startQuireNoteArea } from "./notes";
import {
  appendQuireMeasuredContainerSourceContext,
  createQuireMeasuredContainerSourceContextBuilder,
  withQuireMeasuredContainerSourceContext
} from "./source-context";
import type {
  QuireMeasuredContainerPaginationOptions,
  QuireMeasuredContainerPaginationResult
} from "./types";

/**
 * Paginates measured container items without widow/orphan control.
 *
 * @param options - Measured container pagination inputs.
 * @returns Pagination result for the accepted fragment.
 */
export function paginateQuireMeasuredContainerCore(
  options: QuireMeasuredContainerPaginationOptions
): QuireMeasuredContainerPaginationResult {
  const startIndex = clampQuireMeasuredContainerStartIndex(
    options.startIndex,
    options.container.items.length
  );
  let consumedHeight = 0;
  let noteArea = startQuireNoteArea(options);
  let nextIndex = startIndex;
  let endInfo = options.incomingEndInfo;
  let acceptedRange: QuireDocumentRange | null = null;
  const sourceContext = createQuireMeasuredContainerSourceContextBuilder(options);
  const successorPrefixes = new Map<number, number>();

  for (let index = startIndex; index < options.container.items.length; index += 1) {
    const item = options.container.items[index]!;

    if (item.breakBefore === "page") {
      if (acceptedRange !== null) {
        return withQuireMeasuredContainerSourceContext({
          kind: "spill",
          range: acceptedRange,
          consumedHeight,
          nextIndex,
          endInfo
        }, sourceContext);
      }

      if (!options.isPageTop) {
        return withQuireMeasuredContainerSourceContext({
          kind: "spill",
          range: createCollapsedQuireRange(item.range.from),
          consumedHeight: 0,
          nextIndex: index,
          endInfo
        }, sourceContext);
      }
    }

    // Group policies are evaluated only at the complete group boundary. A
    // continued oversized group therefore resumes inside the group and cannot
    // repeatedly spill without accepting content.
    if (shouldSpillBeforeQuireMeasuredGroup(
      options,
      index,
      consumedHeight,
      acceptedRange !== null,
      successorPrefixes
    )) {
      return withQuireMeasuredContainerSourceContext({
        kind: "spill",
        range: acceptedRange ?? createCollapsedQuireRange(item.range.from),
        consumedHeight,
        nextIndex: index,
        endInfo
      }, sourceContext);
    }

    // The gap above an item counts only when it is not the first accepted item on
    // this page, so a margin at a page break collapses (mature flow behavior).
    const itemGap = acceptedRange === null ? 0 : Math.max(0, item.gapBefore ?? 0);
    const itemHeight = Math.max(0, item.height);
    const nextHeight = consumedHeight + itemGap + itemHeight;
    // Notes grow from the fragment bottom; an item fits only when its notes
    // fit too, or its first note can start here and continue.
    const nextNoteArea = addQuireItemNotes(noteArea, item, nextHeight, options);

    if (nextNoteArea === null) {
      if (acceptedRange !== null) {
        return withQuireMeasuredContainerSourceContext({
          kind: "spill",
          range: acceptedRange,
          consumedHeight,
          nextIndex,
          endInfo
        }, sourceContext);
      }

      if (options.isPageTop && item.canSplit === false) {
        const nextEndInfo = mergeQuireAcceptedItemEndInfo(endInfo, item.endInfo);
        appendQuireMeasuredContainerSourceContext(sourceContext, item);

        return withQuireMeasuredContainerSourceContext({
          kind: "place-and-overflow",
          range: item.range,
          consumedHeight: itemHeight,
          nextIndex: index + 1,
          endInfo: nextEndInfo
        }, sourceContext);
      }

      return withQuireMeasuredContainerSourceContext({
        kind: "spill",
        range: createCollapsedQuireRange(item.range.from),
        consumedHeight: 0,
        nextIndex: index,
        endInfo
      }, sourceContext);
    }

    consumedHeight = nextHeight;
    noteArea = nextNoteArea;
    nextIndex = index + 1;
    acceptedRange = extendQuireMeasuredContainerRange(acceptedRange, item.range);
    endInfo = mergeQuireAcceptedItemEndInfo(endInfo, item.endInfo);
    appendQuireMeasuredContainerSourceContext(sourceContext, item);

    if (item.breakAfter !== undefined && nextIndex < options.container.items.length) {
      return withQuireMeasuredContainerSourceContext({
        kind: "spill",
        range: acceptedRange,
        consumedHeight,
        nextIndex,
        endInfo
      }, sourceContext);
    }
  }

  return withQuireMeasuredContainerSourceContext({
    kind: "done",
    range: acceptedRange ?? createCollapsedQuireRange(options.container.range.to),
    consumedHeight,
    nextIndex,
    endInfo
  }, sourceContext);
}

/**
 * Merges an accepted item's end info through the common no-op fast path.
 *
 * @param incoming - Resume state before the item.
 * @param itemEndInfo - Optional resume state recorded by the item.
 * @returns Resume state after the item.
 */
function mergeQuireAcceptedItemEndInfo(
  incoming: QuirePageEndInfo,
  itemEndInfo: QuirePageEndInfo | undefined
): QuirePageEndInfo {
  return itemEndInfo === undefined
    ? incoming
    : mergeQuireMeasuredContainerEndInfo(incoming, itemEndInfo);
}
