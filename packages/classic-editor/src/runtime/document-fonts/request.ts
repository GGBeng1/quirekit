import {
  normalizeQuireDocumentFontTable,
  normalizeQuireDocumentFontTheme
} from "@quirekit/core";
import type { ClassicDocumentFontRequest, ClassicEditorDocumentFontSource } from "./types";

/**
 * Reads the body Latin family and alternate table without traversing document content.
 *
 * @param document - Document-owned font attributes from PM or JSON.
 * @returns Host-independent resolution request.
 */
export function readClassicDocumentFontRequest(
  document: ClassicEditorDocumentFontSource
): ClassicDocumentFontRequest {
  const attrs = readRecord(document.attrs);
  const theme = normalizeQuireDocumentFontTheme(attrs?.fontTheme);
  return {
    requestedFamily: theme?.body.latin ?? null,
    fontTable: normalizeQuireDocumentFontTable(attrs?.fontTable)
  };
}

/**
 * Reads one non-array record.
 *
 * @param value - Candidate record.
 * @returns Record or undefined.
 */
function readRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : undefined;
}
