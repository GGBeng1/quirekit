import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireEndNoteArea, QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutContainer, QuireLayoutDocument } from "../../../layout/engine/types";
import { createQuirePageBandStoryInstance } from "../page-bands/occurrence";
import { sliceQuireStoryLayout } from "./slice";
import type { AttachQuirePageNoteInstancesOptions } from "./types";

/**
 * Instantiates measured note slices into accepted document-space areas in source order.
 * @param options - Canonical sources and occurrence services shared by both note kinds.
 * @param resolveAreas - Kind-specific geometry; undefined preserves the original page.
 * @returns Layout with appended note instances, anchors, ranges, and separator rules.
 */
export function attachQuirePageNoteInstances(
  options: AttachQuirePageNoteInstancesOptions,
  resolveAreas: (page: QuirePageFragment) => readonly QuireEndNoteArea[] | undefined
): QuireLayoutDocument {
  const section = options.section ?? options.pageModel.leadingSection(options.documentNode);
  if (options.sources.length === 0 || section === null) return options.layoutDocument;
  const sources = new Map(options.sources.map(source => [source.noteId, source]));
  const separator = options.pageModel.footnoteSeparator;
  const commandOwner = { position: section.position, nodeType: section.nodeType,
    ...(section.stableId === null ? {} : { stableId: section.stableId }) };
  const instances: QuireLayoutContainer[] = [];
  const anchors: QuireLayoutDocument["anchors"][number][] = [];
  let changed = false;

  // Pagination owns the area and continuation decision. Occurrence placement
  // consumes those facts once without measuring or paginating the note again.
  const pages = options.layoutDocument.pages.map(page => {
    const areas = resolveAreas(page);
    if (areas === undefined) return page;
    changed = true;
    const noteSeparators: QuireRect[] = [];
    const noteRanges: QuireDocumentRange[] = [];
    for (const area of areas) {
      const bandHeight = area.continuation ? options.continuationSeparatorHeight : options.separatorHeight;
      noteSeparators.push({
        x: area.rect.x, y: area.rect.y + (bandHeight - separator.lineWidth) / 2,
        width: area.continuation ? area.rect.width : Math.min(separator.length, area.rect.width),
        height: separator.lineWidth
      });
      let y = area.rect.y + bandHeight;
      for (const note of area.notes) {
        const source = sources.get(note.id);
        if (source === undefined) continue;
        const layout = sliceQuireStoryLayout(source.layout, note.offset, note.height);
        const result = createQuirePageBandStoryInstance(
          { storyId: source.storyId, kind: "footer", layout, anchors: source.anchors, sourceCapabilities: source.sourceCapabilities },
          "footer", commandOwner, page, 0, section, options.pageCount, options.textMeasurer, options.pageModel,
          page.pageIndex, { x: area.rect.x, y }
        );
        instances.push(result.instance);
        anchors.push(...result.anchors);
        noteRanges.push(layout.range);
        y += note.height;
      }
    }
    return { ...page, noteSeparators: [...(page.noteSeparators ?? []), ...noteSeparators],
      noteRanges: [...(page.noteRanges ?? []), ...noteRanges] };
  });

  return changed ? { ...options.layoutDocument, pages, children: [...options.layoutDocument.children, ...instances],
    anchors: [...options.layoutDocument.anchors, ...anchors] } : options.layoutDocument;
}
