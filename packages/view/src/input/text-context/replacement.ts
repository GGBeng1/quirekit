import type { NativeTextReplacement, QuireNativeTextContext } from "./types";

/**
 * Resolves a browser value replacement against one exact context document.
 * @param context - Original native text and canonical boundary map.
 * @param value - Browser text after an edit.
 * @returns Replacement, or null for unchanged/unmappable text.
 */
export function readNativeTextReplacement(
  context: QuireNativeTextContext,
  value: string
): NativeTextReplacement | null {
  const previous = context.text;
  if (previous === value) return null;
  let start = 0;
  while (start < previous.length && start < value.length && previous[start] === value[start]) start++;
  // A shared high surrogate is not a safe boundary for replacing an emoji.
  if (start > 0 && isHighSurrogate(previous.charCodeAt(start - 1))) start--;
  let oldEnd = previous.length;
  let newEnd = value.length;
  while (oldEnd > start && newEnd > start && previous[oldEnd - 1] === value[newEnd - 1]) {
    oldEnd--; newEnd--;
  }
  if (oldEnd < previous.length && isLowSurrogate(previous.charCodeAt(oldEnd))) {
    oldEnd++; newEnd++;
  }
  const from = context.positions[start];
  const to = context.positions[oldEnd];
  return from == null || to == null || from > to
    ? null
    : { from, to, text: value.slice(start, newEnd) };
}

/** @param code - UTF-16 code unit. @returns Whether it starts a surrogate pair. */
function isHighSurrogate(code: number): boolean { return code >= 0xd800 && code <= 0xdbff; }

/** @param code - UTF-16 code unit. @returns Whether it ends a surrogate pair. */
function isLowSurrogate(code: number): boolean { return code >= 0xdc00 && code <= 0xdfff; }
