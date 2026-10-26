import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MarkdownSourceInput, MarkdownSourceSnapshot, MarkdownReadingError } from "../types";
import { MarkdownSourceStore } from "./store";

/** @param input - Authoritative source and immutable parser configuration. @param onError - Committed parser failure observer.
 * @returns Cached immutable source snapshot with a single cancellable parse continuation. */
export function useMarkdownSource(input: MarkdownSourceInput, onError: (failure: MarkdownReadingError) => void = console.error): MarkdownSourceSnapshot {
  const [store] = useState(() => new MarkdownSourceStore(input));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const reported = useRef<MarkdownReadingError | undefined>(undefined);
  // Host changes are accepted after commit. Speculative React renders may inspect
  // the previous snapshot but never mutate an already accepted parser session.
  useLayoutEffect(() => { store.update(input); }, [store, input.content, input.state, input.identity, input.options]);
  useLayoutEffect(() => {
    if (snapshot.error && reported.current !== snapshot.error) {
      reported.current = snapshot.error;
      try { onError(snapshot.error); } catch (cause) { console.error(cause); }
    }
  }, [snapshot.error, onError]);
  return snapshot;
}
