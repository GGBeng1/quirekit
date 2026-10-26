import type {
  ClassicEditorWebFontBrowseRequest,
  ClassicEditorWebFontCatalogPage,
  ClassicEditorWebFontSource
} from "../../../types";

/**
 * Browses paged sources and adapts legacy complete-result search sources.
 *
 * @param source - Configured source adapter.
 * @param request - Query, settings, page size, and optional cursor.
 * @returns One bounded provider page.
 */
export async function browseClassicWebFontSource(
  source: ClassicEditorWebFontSource,
  request: ClassicEditorWebFontBrowseRequest
): Promise<ClassicEditorWebFontCatalogPage> {
  if (source.browse !== undefined) return source.browse(request);
  const matches = await source.search({
    query: request.query,
    ...(request.subsets === undefined ? {} : { subsets: request.subsets }),
    settings: request.settings
  });
  const offset = parseLegacyCursor(request.cursor, matches.length);
  const end = Math.min(matches.length, offset + request.limit);
  return {
    items: matches.slice(offset, end),
    total: matches.length,
    ...(end < matches.length ? { nextCursor: String(end) } : {})
  };
}

/**
 * Parses a bounded numeric cursor produced by the legacy adapter.
 *
 * @param cursor - Optional numeric offset cursor.
 * @param total - Complete legacy result count.
 * @returns Safe zero-based result offset.
 */
function parseLegacyCursor(cursor: string | undefined, total: number): number {
  if (cursor === undefined) return 0;
  const value = Number(cursor);
  if (!Number.isSafeInteger(value) || value < 0 || value > total) {
    throw new RangeError("Invalid legacy font source cursor.");
  }
  return value;
}
