import { systemClock } from "./clock";
import type { CoalescerOptions } from "./types";

/**
 * Merges consecutive mergeable candidates of one key (such as one connection's typing) until a pause,
 * a non-mergeable candidate or an explicit flush. Merging rules belong to the caller.
 * @param options - Merge rules, emission and timing.
 * @returns Push and flush functions plus read access to open candidates.
 */
export function createActivityCoalescer<Candidate>(options: CoalescerOptions<Candidate>) {
  const clock = options.clock ?? systemClock, wait = options.mergeMs ?? 3000;
  const open = new Map<string, { candidate: Candidate; at: number; cancel: () => void }>();
  /** @param key - Key to emit. */
  const flush = (key: string): void => {
    const entry = open.get(key);
    if (!entry) return;
    entry.cancel(); open.delete(key); options.emit(entry.candidate);
  };
  /** @param key - Key whose pause timer restarts. @param candidate - Collecting candidate. */
  const keep = (key: string, candidate: Candidate): void => {
    open.get(key)?.cancel();
    open.set(key, { candidate, at: clock.now(), cancel: clock.schedule(() => flush(key), wait) });
  };
  return {
    /** @param key - Merge key. @param candidate - New candidate. @param mergeable - Whether it may merge with neighbors. */
    push(key: string, candidate: Candidate, mergeable: boolean): void {
      const entry = open.get(key);
      if (mergeable && entry && clock.now() - entry.at <= wait && options.canMerge(entry.candidate, candidate)) {
        keep(key, options.merge(entry.candidate, candidate)); return;
      }
      flush(key);
      if (mergeable) keep(key, candidate); else options.emit(candidate);
    },
    flush,
    /** Emits every open candidate. */
    flushAll(): void { for (const key of [...open.keys()]) flush(key); },
    /** @param update - Rewrites open candidates in place, e.g. to map positions after another connection's change; returning null emits it. */
    update(update: (key: string, candidate: Candidate) => Candidate | null): void {
      for (const [key, entry] of [...open]) {
        const next = update(key, entry.candidate);
        if (next === null) flush(key); else open.set(key, { ...entry, candidate: next });
      }
    },
  };
}
