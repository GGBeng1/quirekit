import type { Text } from "@quirekit/cm-state";

/**
 * @param doc - Source text.
 * @param from - Range start.
 * @param to - Range end.
 * @param limit - Byte limit.
 * @returns The fragment, cut at the limit, and whether it was cut.
 */
export function boundedSlice(doc: Text, from: number, to: number, limit: number): { readonly text: string; readonly truncated: boolean } {
  // Reading at most `limit` UTF-16 units bounds the work before measuring UTF-8 bytes.
  const text = doc.sliceString(from, Math.min(to, from + limit));
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= limit && to - from <= limit) return { text, truncated: false };
  let end = text.length;
  while (end > 0 && encoder.encode(text.slice(0, end)).length > limit) end = Math.floor(end * 0.9);
  return { text: text.slice(0, end), truncated: true };
}

/**
 * @param doc - Source text.
 * @param from - Changed range start.
 * @param to - Changed range end.
 * @returns The whole lines covering the range, so fragments read as complete Markdown.
 */
export function lineRange(doc: Text, from: number, to: number): { readonly from: number; readonly to: number } {
  return { from: doc.lineAt(from).from, to: doc.lineAt(Math.min(to, doc.length)).to };
}
