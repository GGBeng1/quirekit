import type { QuireMeasuredContainer, QuireMeasuredContainerNote } from "@quirekit/layout/pagination";
import type { QuireLayoutDocumentPaginationOptions, QuireLayoutPaginationNote } from "./types";

/**
 * Attaches each note to the measured item whose range holds its reference.
 *
 * Returns a new container so cached measured items stay unchanged; notes whose
 * reference lies outside the container are ignored.
 *
 * @param container - Measured body container.
 * @param notes - Notes with reference positions and measured heights.
 * @returns Container whose items carry their notes.
 */
export function attachQuireMeasuredContainerNotes(
  container: QuireMeasuredContainer,
  notes: readonly QuireLayoutPaginationNote[] | undefined
): QuireMeasuredContainer {
  if (notes === undefined || notes.length === 0) {
    return container;
  }
  const byItem = new Map<number, QuireMeasuredContainerNote[]>();
  for (const note of notes) {
    const index = container.items.findIndex((item) =>
      item.range.from <= note.referencePosition && note.referencePosition < item.range.to);
    if (index < 0) continue;
    const list = byItem.get(index) ?? [];
    list.push({ id: note.id, height: note.height, ...(note.lines === undefined ? {} : { lines: note.lines }) });
    byItem.set(index, list);
  }
  if (byItem.size === 0) {
    return container;
  }
  return {
    ...container,
    items: container.items.map((item, index) => {
      const itemNotes = byItem.get(index);
      return itemNotes === undefined ? item : { ...item, notes: [...(item.notes ?? []), ...itemNotes] };
    })
  };
}

/**
 * Creates the cache-key suffix covering note placement inputs.
 *
 * @param options - Pagination options carrying notes and the separator height.
 * @returns Empty for note-free documents, otherwise a stable suffix.
 */
export function createQuireNotesKey(
  options: Pick<QuireLayoutDocumentPaginationOptions, "notes" | "noteSeparatorHeight" | "noteContinuationSeparatorHeight">
): string {
  if (options.notes === undefined || options.notes.length === 0) {
    return "";
  }
  return `|notes:${options.noteSeparatorHeight ?? 0}:${options.noteContinuationSeparatorHeight ?? 0}:${options.notes
    .map((note) => `${note.id},${note.referencePosition},${note.height},${(note.lines ?? []).join("/")}`).join(";")}`;
}
