import * as Y from "yjs";

/** One observed source change, located in the shared text. */
export interface SourceChange {
  /** Connection that sent the update. */
  readonly socket: string;
  /** Start of the covered lines in the current text. */
  readonly from: number;
  /** End of the covered lines in the current text. */
  readonly to: number;
  /** Covered lines before the change. */
  readonly before: string;
  /** Covered lines after the change. */
  readonly after: string;
  /** Text inserted by the change. */
  readonly inserted: string;
  /** Characters deleted by the change. */
  readonly deleted: number;
  /** Change in document length. */
  readonly delta: number;
  /** Server time of the first change. */
  readonly at: number;
  /** Whether either fragment was cut at the byte limit. */
  readonly truncated: boolean;
}

/**
 * Locates the change between two versions of the source by trimming their common prefix and suffix, then widens it
 * to whole lines so fragments read as complete Markdown. Linear in the source length.
 * @param previous - Source before the update.
 * @param next - Source after the update.
 * @param limit - Byte limit per fragment.
 * @returns Change fields without the connection and time, or null when the text did not change.
 */
export function locateChange(previous: string, next: string, limit: number): Omit<SourceChange, "socket" | "at"> | null {
  if (previous === next) return null;
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let endA = previous.length, endB = next.length;
  while (endA > start && endB > start && previous[endA - 1] === next[endB - 1]) { endA--; endB--; }
  const lineStart = previous.lastIndexOf("\n", start - 1) + 1;
  const lineEndA = lineEnd(previous, endA), lineEndB = lineEnd(next, endB);
  const before = clip(previous.slice(lineStart, lineEndA), limit), after = clip(next.slice(lineStart, lineEndB), limit);
  return { from: lineStart, to: lineEndB, before: before.text, after: after.text, inserted: next.slice(start, endB),
    deleted: endA - start, delta: next.length - previous.length, truncated: before.truncated || after.truncated };
}

/** @param text - Source. @param position - Offset. @returns End of the line containing the offset. */
function lineEnd(text: string, position: number): number {
  const end = text.indexOf("\n", position);
  return end < 0 ? text.length : end;
}

/** @param text - Fragment. @param limit - Byte limit. @returns Fragment cut to the limit. */
function clip(text: string, limit: number): { readonly text: string; readonly truncated: boolean } {
  const encoder = new TextEncoder();
  if (encoder.encode(text).length <= limit) return { text, truncated: false };
  let end = Math.min(text.length, limit);
  while (end > 0 && encoder.encode(text.slice(0, end)).length > limit) end = Math.floor(end * 0.9);
  return { text: text.slice(0, end), truncated: true };
}

/**
 * @param text - Shared source text.
 * @param from - Range start.
 * @param to - Range end.
 * @returns Base64 Yjs relative positions that follow the range through later concurrent edits.
 */
export function relativeRange(text: Y.Text, from: number, to: number): { readonly from: string; readonly to: string } {
  /** @param index - Text index. @param assoc - Side the position sticks to. @returns Encoded position. */
  const encode = (index: number, assoc: number): string => {
    const bytes = Y.encodeRelativePosition(Y.createRelativePositionFromTypeIndex(text, Math.min(index, text.length), assoc));
    let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  };
  return { from: encode(from, 0), to: encode(to, -1) };
}
