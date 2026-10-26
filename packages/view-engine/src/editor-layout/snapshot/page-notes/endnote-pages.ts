import { appendQuireEndNotes, createQuirePaginatedDocumentRect, type QuirePageGeometry } from "@quirekit/layout/pagination";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { quireDefaultLayoutBlockHeight } from "../constants";
import { collectQuireStoryLineBottoms } from "./slice";
import type { QuirePageEndnoteSourceLayout } from "./types";

/**
 * Places end notes after the last accepted content of a paginated flow.
 *
 * End notes follow the body, so they are placed only after body pagination
 * and may append pages that hold nothing else.
 *
 * @param document - Paginated flow document.
 * @param sources - Measured end note bodies in display order.
 * @param pageGeometry - Geometry that paginated the flow.
 * @returns Document whose pages carry end-note areas, or the input without notes.
 */
export function appendQuirePageEndnotes(
  document: QuireLayoutDocument,
  sources: readonly QuirePageEndnoteSourceLayout[],
  pageGeometry: QuirePageGeometry
): QuireLayoutDocument {
  if (sources.length === 0) return document;
  const pages = appendQuireEndNotes({
    fragments: document.pages,
    pageGeometry,
    notes: sources.map((source) => ({
      id: source.noteId, height: source.layout.rect.height, lines: collectQuireStoryLineBottoms(source.layout)
    })),
    separatorHeight: quireDefaultLayoutBlockHeight,
    continuationSeparatorHeight: quireDefaultLayoutBlockHeight
  });
  return { ...document, pages, rect: createQuirePaginatedDocumentRect(document.rect, pages) };
}
