import type { QuireEndNoteArea, QuirePageFragment } from "@quirekit/layout/pagination";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { attachQuirePageNoteInstances } from "./placement";
import type { AttachQuirePageFootnoteInstancesOptions } from "./types";
export type { AttachQuirePageFootnoteInstancesOptions } from "./types";

/**
 * Places footnotes at the reserved bottom of each page or column.
 * @param options - Projected pages, measured notes, and separator geometry.
 * @returns Document with selectable note occurrences and separator rules.
 */
export function attachQuirePageFootnoteInstances(options: AttachQuirePageFootnoteInstancesOptions): QuireLayoutDocument {
  return attachQuirePageNoteInstances(options, resolveFootnoteAreas);
}

/**
 * Converts page/column bottom reservations into ordered document-space note areas.
 * @param page - Accepted page carrying its own or its columns' note reservations.
 * @returns Explicit areas, or undefined when this page has no note placement work.
 */
function resolveFootnoteAreas(page: QuirePageFragment): readonly QuireEndNoteArea[] | undefined {
  // Balanced columns may finish above the reserved note bottom. Resolve that
  // authority before the common top-down placement consumes area coordinates.
  const areas = (page.columns ?? [page]).flatMap(area => {
    if (area.notes === undefined) return [];
    const height = area.noteAreaHeight ?? 0;
    return [{
      rect: { ...area.bodyRect, height, y: (page.noteAreaBottom ?? area.bodyRect.y + area.bodyRect.height) - height },
      notes: area.notes,
      continuation: area.notes[0]?.continuation === true
    }];
  });
  return areas.length === 0 ? undefined : areas;
}
