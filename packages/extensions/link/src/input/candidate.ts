import type { EditorState, MarkType } from "@quirekit/pm";
import { defaultLinkHrefMaximumLength } from "../href";
import { findAutomaticLinkMatches } from "../authoring/matches";
import type { LinkTypingIntent } from "./types";

/**
 * Reads only a bounded suffix of the current inline text block.
 * @param state - Exact pre-input state.
 * @param type - Link mark.
 * @param text - Completing whitespace or null for Enter.
 * @returns Eligible URL with source coordinates, or null.
 */
export function captureLinkTypingIntent(state: EditorState, type: MarkType, text: string | null): LinkTypingIntent | null {
  const { $from, empty } = state.selection;
  const parent = $from.parent;
  if (!empty || !parent.inlineContent || parent.type.spec.code || !parent.type.allowsMarkType(type)) return null;
  if (state.storedMarks?.some(mark => mark.type.spec.code || mark.type === type)) return null;
  const start = Math.max(0, $from.parentOffset - defaultLinkHrefMaximumLength - 1);
  const source = parent.textBetween(start, $from.parentOffset, "", "\ufffc");
  const match = findAutomaticLinkMatches(source).at(-1);
  if (!match || (start > 0 && match.start === 0) || /[\p{L}\p{N}]/u.test(source.slice(match.end))) return null;
  const from = $from.start() + start + match.start;
  const to = $from.start() + start + match.end;
  let eligible = true;
  state.doc.nodesBetween(from, to, node => {
    if (node.isInline && (!node.isText || node.marks.some(mark => mark.type === type
      || mark.type.spec.code || mark.type.excludes(type) || type.excludes(mark.type)))) eligible = false;
  });
  return eligible ? { doc: state.doc, from, to, href: match.href, caret: $from.pos, text } : null;
}
