import type { InlineContext } from "@quirekit/lezer-markdown";

/**
 * Bounds a native inline-destination probe, so successive short links never parse each other's suffixes.
 * This locates a possible envelope; the installed grammar remains the acceptance authority.
 * @param context - Native paragraph source.
 * @param opening - Destination's opening parenthesis.
 * @returns Candidate exclusive end, or no complete envelope.
 */
export function destinationEnvelope(context: InlineContext, opening: number): number | undefined {
  let cursor = context.skipSpace(opening + 1);
  if (context.char(cursor) === 60) {
    cursor++;
    while (cursor < context.end && context.char(cursor) !== 62) {
      if (context.char(cursor) === 10) return undefined;
      cursor += context.char(cursor) === 92 ? 2 : 1;
    }
    if (cursor >= context.end) return undefined;
    cursor++;
  } else {
    let nesting = 0;
    while (cursor < context.end) {
      const character = context.char(cursor);
      if (/\s/u.test(context.slice(cursor, cursor + 1)) || character === 41 && nesting === 0) break;
      if (character === 92) { cursor += 2; continue; }
      if (character === 40) nesting++;
      if (character === 41) nesting--;
      cursor++;
    }
  }
  const destinationEnd = cursor; cursor = context.skipSpace(cursor);
  if (context.char(cursor) === 41) return cursor + 1;
  const quote = context.char(cursor), closing = quote === 40 ? 41 : quote;
  if (cursor === destinationEnd || ![34, 39, 40].includes(quote)) return undefined;
  cursor++;
  while (cursor < context.end && context.char(cursor) !== closing) cursor += context.char(cursor) === 92 ? 2 : 1;
  if (cursor >= context.end) return undefined;
  cursor = context.skipSpace(cursor + 1);
  return context.char(cursor) === 41 ? cursor + 1 : undefined;
}
