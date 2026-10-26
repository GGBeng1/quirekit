import type { AutoCorrectEntry, AutoCorrectMatch } from "./types";

const wordCharacter = /[\p{L}\p{N}_]/u;
const sentenceEnd = /[.!?。！？]/u;

/**
 * Finds the table entry the text before the caret now ends with.
 *
 * The longest entry wins. An entry that starts with a letter or digit only
 * matches at a word start, so "a(c)" never becomes "a©" while "(c)" does.
 *
 * @param text - Text of the block before the caret, including the typed text.
 * @param entries - Replacement table.
 * @returns The replacement, or null.
 */
export function findAutoCorrectReplacement(text: string, entries: readonly AutoCorrectEntry[]): AutoCorrectMatch | null {
  let best: AutoCorrectEntry | null = null;
  const lower = text.toLowerCase();
  for (const entry of entries) {
    if (entry.from.length === 0 || (best !== null && entry.from.length <= best.from.length)) continue;
    if (!lower.endsWith(entry.from.toLowerCase())) continue;
    const before = text.slice(0, text.length - entry.from.length);
    if (wordCharacter.test(entry.from[0]!) && /[A-Za-z0-9_]$/u.test(before)) continue;
    best = entry;
  }
  return best === null ? null : { length: best.from.length, replacement: best.to };
}

/**
 * Capitalizes the word just finished when it starts a sentence.
 *
 * Applies when a space, comma, semicolon, colon, exclamation or question mark
 * follows a word of Latin letters starting in lowercase, and the word opens
 * the block or follows a sentence end that is not one of the exception
 * abbreviations.
 *
 * @param text - Text of the block before the caret, including the typed delimiter.
 * @param exceptions - Lowercase abbreviations such as "e.g.".
 * @returns The capitalized word plus delimiter, or null.
 */
export function findSentenceCapitalization(text: string, exceptions: ReadonlySet<string>): AutoCorrectMatch | null {
  const match = /([a-z][A-Za-z'’-]*)([ ,;:!?])$/u.exec(text);
  if (match === null || /[A-Z]/u.test(match[1]!.slice(1))) return null;
  const before = text.slice(0, match.index);
  if (before.length > 0 && wordCharacter.test(before.at(-1)!)) return null;
  const lead = before.replace(/[\s"'“‘(（\[【]*$/u, "");
  if (lead.length > 0) {
    if (!sentenceEnd.test(lead.at(-1)!)) return null;
    if (before.length === lead.length && !/[。！？]$/u.test(lead)) return null;
    const previous = /(\S+)$/u.exec(lead)?.[1]?.toLowerCase();
    if (previous !== undefined && exceptions.has(previous)) return null;
  }
  const word = match[1]!;
  return { length: word.length + 1, replacement: `${word[0]!.toUpperCase()}${word.slice(1)}${match[2]}` };
}
