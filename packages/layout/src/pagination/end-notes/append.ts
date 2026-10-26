import { findQuireLastNoteCut } from "../container/notes";
import type { QuirePageNote } from "../container";
import { resolveQuirePageGeometryForIndex } from "../geometry";
import type { QuireEndNoteArea, QuirePageFragment } from "../types";
import { listQuireAppendedPageEndNoteSlots, listQuireLastPageEndNoteSlots } from "./slots";
import type { QuireEndNotePlacementOptions, QuireEndNoteSlot } from "./types";

/** Part of a note still to place. */
interface QuireQueuedEndNote {
  /** Note definition index. */
  readonly index: number;
  /** Height of the note already placed. */
  consumed: number;
}

/**
 * Places notes collected after the end of a flow, appending pages until all fit.
 *
 * The notes start below the last content of the flow, in the column where it
 * ended, and continue line by line through the following columns and pages.
 * Each area opens with a separator band: the first with the short rule band,
 * later ones with the continuation band. Appended pages reuse the flow's page
 * geometry and hold no body content.
 *
 * @param options - Accepted fragments, page geometry and ordered note bodies.
 * @returns Fragments carrying end-note areas; the input when there are no notes.
 */
export function appendQuireEndNotes(options: QuireEndNotePlacementOptions): readonly QuirePageFragment[] {
  const last = options.fragments.at(-1);
  if (options.notes.length === 0 || last === undefined) return options.fragments;
  const fragments = [...options.fragments];
  const areas = new Map<number, QuireEndNoteArea[]>();
  const queue: QuireQueuedEndNote[] = options.notes.map((_note, index) => ({ index, consumed: 0 }));
  let slots = listQuireLastPageEndNoteSlots(last, fragments.length - 1,
    resolveQuirePageGeometryForIndex(options.pageGeometry, last.pageIndex));
  let pageIndex = last.pageIndex;

  // Phase 1: fill slots in flow order. A slot that cannot show one line is
  // skipped unless it starts at its body top, where the first part always goes in.
  while (queue.length > 0) {
    for (const slot of slots) {
      if (queue.length === 0) break;
      const area = fillSlot(slot, queue, options, areas.size === 0);
      if (area !== null) areas.set(slot.fragmentIndex, [...(areas.get(slot.fragmentIndex) ?? []), area]);
    }
    if (queue.length === 0) break;
    pageIndex += 1;
    const geometry = resolveQuirePageGeometryForIndex(options.pageGeometry, pageIndex);
    fragments.push(createEndNotePage(last, pageIndex, geometry));
    slots = listQuireAppendedPageEndNoteSlots(fragments.length - 1, geometry);
  }

  // Phase 2: attach the areas to their fragments.
  return fragments.map((fragment, index) => {
    const placed = areas.get(index);
    return placed === undefined ? fragment : { ...fragment, endNoteAreas: placed };
  });
}

/**
 * Places as much of the queue as fits in one slot.
 *
 * @param slot - Space available in one page or column.
 * @param queue - Remaining note parts, consumed in place.
 * @param options - Note definitions and separator bands.
 * @param first - Whether no end-note area exists yet.
 * @returns The filled area, or null when nothing was placed.
 */
function fillSlot(
  slot: QuireEndNoteSlot,
  queue: QuireQueuedEndNote[],
  options: QuireEndNotePlacementOptions,
  first: boolean
): QuireEndNoteArea | null {
  const band = first ? options.separatorHeight : options.continuationSeparatorHeight;
  const space = slot.bottom - slot.top - band;
  const notes: QuirePageNote[] = [];
  let used = 0;
  while (queue.length > 0) {
    const entry = queue[0]!;
    const definition = options.notes[entry.index]!;
    const remaining = Math.max(0, definition.height - entry.consumed);
    let cut = used + remaining <= space ? definition.height : findQuireLastNoteCut(definition, entry.consumed, space - used);
    // The first part of an area at a body top always goes in, so placement ends.
    if (cut === entry.consumed && notes.length === 0 && slot.atBodyTop) cut = definition.height;
    if (cut === entry.consumed) break;
    notes.push({ id: definition.id, offset: entry.consumed, height: cut - entry.consumed, continuation: entry.consumed > 0 });
    used += cut - entry.consumed;
    if (cut < definition.height) {
      entry.consumed = cut;
      break;
    }
    queue.shift();
  }
  if (notes.length === 0) return null;
  return { rect: { x: slot.x, y: slot.top, width: slot.width, height: band + used }, notes, continuation: !first };
}

/**
 * Creates an appended page holding only end notes.
 *
 * @param last - Last fragment of the flow, whose end the page continues.
 * @param pageIndex - Flow-local page index.
 * @param geometry - Resolved page geometry.
 * @returns Fragment with an empty range at the flow end.
 */
function createEndNotePage(
  last: QuirePageFragment,
  pageIndex: number,
  geometry: ReturnType<typeof resolveQuirePageGeometryForIndex>
): QuirePageFragment {
  return {
    pageIndex,
    range: { from: last.range.to, to: last.range.to },
    pageRect: geometry.pageRect,
    bodyRect: geometry.bodyRect,
    rect: { ...geometry.bodyRect, height: 0 },
    ...(last.sourceFlowY === undefined ? {} : { sourceFlowY: last.sourceFlowY + (last.sourceFlowHeight ?? 0), sourceFlowHeight: 0 }),
    endInfo: last.endInfo
  };
}
