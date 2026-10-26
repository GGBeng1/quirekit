/** A successful JSON parse or an explicit raw-source fallback reason. */
export type JsonParseResult =
  | { readonly kind: 'tree'; readonly value: unknown }
  | { readonly kind: 'invalid' | 'large' };

/**
 * Parses only bounded source so the tree never performs unbounded synchronous work.
 * @param source - Original JSON text.
 * @param maxCharacters - Maximum input length admitted to tree inspection.
 * @returns Parsed value or a reason to keep the source view.
 */
export function parseJsonForViewer(source: string, maxCharacters: number): JsonParseResult {
  if (source.length > maxCharacters) return { kind: 'large' };
  try {
    return { kind: 'tree', value: JSON.parse(source) as unknown };
  } catch {
    return { kind: 'invalid' };
  }
}
