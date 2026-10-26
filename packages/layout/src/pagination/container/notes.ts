import type { QuirePageEndInfo } from "../types";
import type {
  QuireMeasuredContainer,
  QuireMeasuredContainerItem,
  QuireMeasuredContainerNote,
  QuireMeasuredContainerPaginationOptions,
  QuirePageNote
} from "./types";

/** Continuation-state key carrying note bodies that continue on the next fragment. */
const pendingNotesKey = "quire.pendingNotes";

/** Part of a note body still to be placed, carried between fragments. */
interface QuirePendingNote {
  /** Note identity. */
  readonly id: string;
  /** Height of the note body already placed on earlier fragments. */
  readonly consumed: number;
}

/** Note area state while a fragment accepts items. */
export interface QuireNoteArea {
  /** Current note area height, separator included. */
  readonly height: number;
  /** Whether some note on this fragment continues on the next one. */
  readonly overflowing: boolean;
}

/** Final note placement for one accepted fragment. */
export interface QuireNotePlacement {
  /** Note slices placed on the fragment in order. */
  readonly notes: readonly QuirePageNote[];
  /** Note area height, separator included. */
  readonly height: number;
  /** Notes continuing on the next fragment. */
  readonly pending: readonly QuirePendingNote[];
}

/** Note definitions indexed per container, rebuilt only for a new container. */
const definitionCache = new WeakMap<QuireMeasuredContainer, ReadonlyMap<string, QuireMeasuredContainerNote>>();

/**
 * Starts a fragment's note area with the notes continued from the previous fragment.
 *
 * Continued notes come first, after the continuation separator. They may use
 * all space except one body line, so the fragment still makes body progress.
 *
 * @param options - Container pagination inputs carrying the incoming continuation.
 * @returns Initial note area state.
 */
export function startQuireNoteArea(options: QuireMeasuredContainerPaginationOptions): QuireNoteArea {
  const pending = readQuirePendingNotes(options.incomingEndInfo);
  if (pending.length === 0 || options.notesBelowFlow === true) {
    return { height: 0, overflowing: false };
  }
  const placement = placeQuireNotes(options, [], pending, options.availableHeight - reserveForBody(options));
  return { height: placement.height, overflowing: placement.pending.length > 0 };
}

/**
 * Computes the note area after accepting one item, or null when the item must move on.
 *
 * Every note of the item fits whole, or the first note shows at least one line
 * here and the rest continues. Once a note continues, no further note joins
 * this fragment.
 *
 * @param area - Note area before the item.
 * @param item - Candidate item.
 * @param bodyHeight - Body height including the item.
 * @param options - Container pagination inputs.
 * @returns Note area including the item's notes, or null when they cannot start here.
 */
export function addQuireItemNotes(
  area: QuireNoteArea,
  item: QuireMeasuredContainerItem,
  bodyHeight: number,
  options: QuireMeasuredContainerPaginationOptions
): QuireNoteArea | null {
  const notes = options.notesBelowFlow === true ? [] : item.notes ?? [];
  if (notes.length === 0) {
    return bodyHeight + area.height <= options.availableHeight ? area : null;
  }
  if (area.overflowing) {
    return null;
  }
  const separator = area.height === 0 ? options.noteSeparatorHeight ?? 0 : 0;
  const whole = area.height + separator + notes.reduce((sum, note) => sum + Math.max(0, note.height), 0);
  if (bodyHeight + whole <= options.availableHeight) {
    return { height: whole, overflowing: false };
  }
  const first = notes[0]!;
  const minimum = area.height + separator + firstLineHeight(first);
  if (first.lines === undefined || bodyHeight + minimum > options.availableHeight) {
    return null;
  }
  return { height: options.availableHeight - bodyHeight, overflowing: true };
}

/**
 * Places the notes of an accepted fragment: continued notes first, then the
 * notes of accepted items in order, splitting at line boundaries when space ends.
 *
 * @param options - Container pagination inputs.
 * @param startIndex - First accepted item.
 * @param endIndex - Exclusive accepted item end.
 * @param bodyHeight - Accepted body height.
 * @returns Note slices, area height and continuation.
 */
export function placeQuireFragmentNotes(
  options: QuireMeasuredContainerPaginationOptions,
  startIndex: number,
  endIndex: number,
  bodyHeight: number
): QuireNotePlacement {
  const fresh: QuirePendingNote[] = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    for (const note of options.container.items[index]?.notes ?? []) fresh.push({ id: note.id, consumed: 0 });
  }
  const pending = readQuirePendingNotes(options.incomingEndInfo);
  return placeQuireNotes(options, fresh, pending, options.availableHeight - bodyHeight);
}

/**
 * Writes the continued notes into resume state for the next fragment.
 *
 * @param endInfo - Resume state at the fragment end.
 * @param pending - Notes continuing on the next fragment.
 * @returns Resume state carrying exactly the given continuation.
 */
export function withQuirePendingNotes(
  endInfo: QuirePageEndInfo,
  pending: readonly QuirePendingNote[]
): QuirePageEndInfo {
  if (pending.length === 0 && endInfo.continuationState?.[pendingNotesKey] === undefined) {
    return endInfo;
  }
  const { [pendingNotesKey]: _previous, ...rest } = endInfo.continuationState ?? {};
  const continuationState = pending.length === 0 ? rest : { ...rest, [pendingNotesKey]: pending };
  const { continuationState: _old, ...base } = endInfo;
  return Object.keys(continuationState).length === 0 ? base : { ...base, continuationState };
}

/**
 * Places continued notes then fresh notes into the available note space.
 *
 * @param options - Container pagination inputs.
 * @param fresh - Notes referenced on this fragment, in order.
 * @param pending - Notes continued from the previous fragment.
 * @param space - Height available to the note area.
 * @returns Placement, area height and the notes still to place.
 */
function placeQuireNotes(
  options: QuireMeasuredContainerPaginationOptions,
  fresh: readonly QuirePendingNote[],
  pending: readonly QuirePendingNote[],
  space: number
): QuireNotePlacement {
  const definitions = readQuireNoteDefinitions(options.container);
  const queue = [...pending.map((note) => ({ ...note, continuation: true })),
    ...fresh.map((note) => ({ ...note, continuation: false }))];
  if (queue.length === 0) {
    return { notes: [], height: 0, pending: [] };
  }
  const separator = pending.length > 0
    ? options.noteContinuationSeparatorHeight ?? options.noteSeparatorHeight ?? 0
    : options.noteSeparatorHeight ?? 0;
  const placed: QuirePageNote[] = [];
  const carry: QuirePendingNote[] = [];
  let height = separator;
  for (const entry of queue) {
    const definition = definitions.get(entry.id);
    if (definition === undefined) continue;
    const remaining = Math.max(0, definition.height - entry.consumed);
    if (carry.length > 0) {
      carry.push({ id: entry.id, consumed: entry.consumed });
      continue;
    }
    if (height + remaining <= space) {
      placed.push({ id: entry.id, offset: entry.consumed, height: remaining, continuation: entry.continuation });
      height += remaining;
      continue;
    }
    const cut = findQuireLastNoteCut(definition, entry.consumed, space - height);
    // The first note of an area always makes progress: an indivisible or
    // first-line-too-tall note overflows rather than continuing forever.
    if (cut === entry.consumed && placed.length === 0) {
      placed.push({ id: entry.id, offset: entry.consumed, height: remaining, continuation: entry.continuation });
      height += remaining;
      continue;
    }
    if (cut > entry.consumed) {
      placed.push({ id: entry.id, offset: entry.consumed, height: cut - entry.consumed, continuation: entry.continuation });
      height += cut - entry.consumed;
    }
    carry.push({ id: entry.id, consumed: Math.max(entry.consumed, cut) });
  }
  return { notes: placed, height: placed.length === 0 ? 0 : height, pending: carry };
}

/**
 * Finds the last line boundary that fits below a note offset.
 *
 * @param note - Note definition with line boundaries.
 * @param offset - Height of the note already placed.
 * @param room - Height available for more of the note.
 * @returns Note offset after the last fitting line, or the offset when none fits.
 */
export function findQuireLastNoteCut(note: QuireMeasuredContainerNote, offset: number, room: number): number {
  let cut = offset;
  for (const boundary of note.lines ?? []) {
    if (boundary <= offset) continue;
    if (boundary - offset > room) break;
    cut = boundary;
  }
  return cut;
}

/**
 * Reads the height of a note's first line.
 *
 * @param note - Note definition.
 * @returns First line height, or the whole note for an indivisible note.
 */
function firstLineHeight(note: QuireMeasuredContainerNote): number {
  return note.lines?.[0] ?? note.height;
}

/**
 * Height kept free for one body line when continued notes fill a fragment.
 *
 * @param options - Container pagination inputs.
 * @returns Height of the first item to place, or 0 at the container end.
 */
function reserveForBody(options: QuireMeasuredContainerPaginationOptions): number {
  return Math.max(0, options.container.items[options.startIndex]?.height ?? 0);
}

/**
 * Reads the notes continuing from the previous fragment.
 *
 * @param endInfo - Incoming resume state.
 * @returns Continued notes, possibly empty.
 */
function readQuirePendingNotes(endInfo: QuirePageEndInfo): readonly QuirePendingNote[] {
  const value = endInfo.continuationState?.[pendingNotesKey];
  return Array.isArray(value) ? value as readonly QuirePendingNote[] : [];
}

/**
 * Indexes the container's note definitions by id.
 *
 * @param container - Measured container.
 * @returns Note definitions keyed by id.
 */
function readQuireNoteDefinitions(container: QuireMeasuredContainer): ReadonlyMap<string, QuireMeasuredContainerNote> {
  const cached = definitionCache.get(container);
  if (cached !== undefined) return cached;
  const definitions = new Map<string, QuireMeasuredContainerNote>();
  for (const item of container.items) {
    for (const note of item.notes ?? []) definitions.set(note.id, note);
  }
  definitionCache.set(container, definitions);
  return definitions;
}
