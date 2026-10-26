import type { QuireLayoutDocument } from "../../../layout/engine/types";
import { attachQuirePageNoteInstances } from "./placement";
import type { AttachQuirePageEndnoteInstancesOptions } from "./types";
export type { AttachQuirePageEndnoteInstancesOptions } from "./types";

/**
 * Places endnotes inside the document-space areas already accepted by pagination.
 * @param options - Projected pages, measured notes, and separator geometry.
 * @returns Document with selectable note occurrences and separator rules.
 */
export function attachQuirePageEndnoteInstances(options: AttachQuirePageEndnoteInstancesOptions): QuireLayoutDocument {
  return attachQuirePageNoteInstances(options, page => page.endNoteAreas);
}
