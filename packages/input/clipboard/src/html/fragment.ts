/**
 * Separates a producer's selected fragment from its HTML transport envelope.
 * @param html - Raw HTML clipboard value, optionally carrying Office fragment markers.
 * @returns Marked content without transport whitespace, or the unchanged unmarked value.
 */
export function readQuireClipboardHtmlFragment(html: string): string {
  const start = /<!--\s*StartFragment\s*-->/i.exec(html);
  if (!start) return html;
  const offset = start.index + start[0].length;
  const remaining = html.slice(offset);
  const end = /<!--\s*EndFragment\s*-->/i.exec(remaining);
  // Never infer a fragment from a partial pair or delete authored empty blocks.
  return end ? remaining.slice(0, end.index).trim() : html;
}
