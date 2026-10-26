import type { EditorState } from "@quirekit/cm-state";
import type { ActivityEvent, ActivityTarget } from "@quirekit/edit-history";
import type { MdCommentsBridge } from "../comments/types";
import type { MdActivityLocation, MdActivityTargetResolver } from "./types";

/**
 * Finds where an activity happened in the current source, in one of four states: `exact` (the recorded place
 * with its recorded text), `approximate` (the place moved or its text changed, and a single match was found),
 * `deleted` (the recorded content no longer exists) or `unavailable` (no reliable answer, e.g. ambiguous text,
 * an orphaned comment or an unknown anchor scheme). Ambiguous text never jumps to a guessed occurrence.
 * @param state - Current editor state.
 * @param event - Listed event.
 * @param resolve - Resolver for other anchor schemes, such as `yjs-relative` in collaboration.
 * @param comments - Installed comment bridge, which locates comment threads.
 * @returns Location state and, unless deleted or unavailable, the current range.
 */
export function locateActivity(state: EditorState, event: ActivityEvent, resolve?: MdActivityTargetResolver, comments?: MdCommentsBridge | null): MdActivityLocation {
  const target = event.target;
  if (!target) return { status: "unavailable" };
  if (target.scheme === "source-range") return sourceRange(state, target);
  if (target.scheme === "comment-thread") return commentThread(state, target, comments);
  const range = resolve?.(target) ?? null;
  if (!range || range.from > range.to || range.to > state.doc.length) return { status: "unavailable" };
  const quote = target.quote ?? "";
  if (!quote) return { status: "exact", range };
  // Anchors that follow concurrent edits collapse when their content is removed.
  if (range.from === range.to) return { status: "deleted" };
  return state.sliceDoc(range.from, range.to) === quote ? { status: "exact", range } : { status: "approximate", range };
}

/** @param state - Current state. @param target - Offsets and quote recorded locally. @returns Location of the recorded text. */
function sourceRange(state: EditorState, target: ActivityTarget): MdActivityLocation {
  const { from, to } = (typeof target.value === "object" && target.value !== null ? target.value : {}) as { from?: unknown; to?: unknown };
  if (typeof from !== "number" || typeof to !== "number" || from > to) return { status: "unavailable" };
  const quote = target.quote ?? "";
  if (!quote) return to <= state.doc.length ? { status: "exact", range: { from, to } } : { status: "deleted" };
  if (to <= state.doc.length && state.sliceDoc(from, from + quote.length) === quote) return { status: "exact", range: { from, to } };
  // Quote search runs only on an explicit click and is bounded by the document size.
  const text = state.doc.toString(), first = text.indexOf(quote);
  if (first < 0) return { status: "deleted" };
  if (text.indexOf(quote, first + 1) >= 0) return { status: "unavailable" };
  return { status: "approximate", range: { from: first, to: first + quote.length } };
}

/**
 * @param state - Current state.
 * @param target - Thread identity.
 * @param comments - Installed comment bridge.
 * @returns The thread's current range, or unavailable without comments.
 */
function commentThread(state: EditorState, target: ActivityTarget, comments: MdCommentsBridge | null | undefined): MdActivityLocation {
  const id = typeof target.value === "object" && target.value !== null ? (target.value as { threadId?: unknown }).threadId : undefined;
  if (!comments || typeof id !== "string") return { status: "unavailable" };
  return comments.locate(state, id);
}
