import type { EditorState } from "@quirekit/cm-state";

const requested = new WeakSet<EditorState>();
const observers = new WeakMap<EditorState, Set<() => void>>();

/** @param state - Incomplete accepted snapshot. Records demand without synchronously advancing the parser. */
export function requestMarkdownParse(state: EditorState): void {
  requested.add(state);
  for (const notify of observers.get(state) ?? []) notify();
}

/** @param state - Mounted snapshot. @param notify - Coalesced scheduler for its view. @returns Observer cleanup; headless queries never allocate a timer. */
export function observeMarkdownParse(state: EditorState, notify: () => void): () => void {
  let listeners = observers.get(state);
  if (!listeners) observers.set(state, listeners = new Set());
  listeners.add(notify);
  if (requested.has(state)) notify();
  return () => { listeners.delete(notify); if (!listeners.size) observers.delete(state); };
}
