import type { QuireKitCommentMention } from "./types";

/**
 * Finds an @ query ending at the caret: an @ at the start or after whitespace, followed by a short run of name characters.
 * @param value - Field text.
 * @param caret - Caret offset.
 * @returns Query start (the @) and text, or null.
 */
export function mentionQuery(value: string, caret: number): { readonly start: number; readonly text: string } | null {
  const match = /(?:^|\s)@([^\s@[\]()]{0,32})$/u.exec(value.slice(0, caret));
  return match ? { start: caret - match[1]!.length - 1, text: match[1]! } : null;
}

/** @param value - Raw text. @param delimiters - Characters that need a backslash. @returns Escaped Markdown text, with entity-safe ampersands. */
function escape(value: string, delimiters: string): string {
  return [...value].map(character => character === "&" ? "&amp;" : character === "\\" || delimiters.includes(character) ? `\\${character}` : character).join("");
}

/** @param mention - Person. @returns Portable Markdown link, `[@name](<url>)`, the same form the MSFE editor writes for mentions. */
export function mentionLink(mention: QuireKitCommentMention): string {
  return `[@${escape(mention.label.replace(/^@/u, ""), "[]*_`<>")}](<${escape(mention.url, "<>")}>)`;
}

/**
 * @param value - Field text.
 * @param chosen - People inserted in this field, keyed by URL.
 * @returns Chosen people whose links are still present.
 */
export function mentionsIn(value: string, chosen: ReadonlyMap<string, QuireKitCommentMention>): QuireKitCommentMention[] {
  return [...chosen.values()].filter(mention => value.includes(mentionLink(mention)));
}
