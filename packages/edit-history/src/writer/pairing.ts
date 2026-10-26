import { systemClock } from "./clock";
import type { ActivityHint, HintPairingOptions } from "./types";

/** A waiting change or hint with its expiry. */
interface Waiting<T> {
  /** Waiting value. */
  readonly value: T;
  /** Cancels its timeout. */
  readonly cancel: () => void;
}

/**
 * Pairs observed changes with hints from the same connection. Either side may arrive first; a change without a
 * matching hint in time resolves with null, and an unmatched hint simply expires.
 * @param options - Matching rule, resolution and timing.
 * @returns Feed functions for changes, hints and closed connections.
 */
export function createHintPairing<Change>(options: HintPairingOptions<Change>) {
  const clock = options.clock ?? systemClock, hold = options.holdMs ?? 1000;
  const hints = new Map<string, Waiting<ActivityHint>[]>(), changes = new Map<string, Waiting<Change>[]>();
  /** @param map - Waiting lists. @param key - Connection. @param item - Item to remove. */
  const remove = <T>(map: Map<string, Waiting<T>[]>, key: string, item: Waiting<T>): void => {
    const list = map.get(key)?.filter(entry => entry !== item) ?? [];
    if (list.length) map.set(key, list); else map.delete(key);
  };
  /** @param connection - Connection key. @param until - Resolve waiting changes before this one, or all when omitted. */
  const release = (connection: string, until?: Waiting<Change>): void => {
    const waiting = changes.get(connection) ?? [], index = until ? waiting.indexOf(until) : waiting.length;
    const earlier = waiting.slice(0, index), rest = waiting.slice(index);
    if (rest.length) changes.set(connection, rest); else changes.delete(connection);
    for (const entry of earlier) { entry.cancel(); options.resolve(entry.value, null); }
  };
  return {
    /** @param connection - Connection key. @param change - Observed change; one connection's changes always resolve in arrival order. */
    change(connection: string, change: Change): void {
      const hint = hints.get(connection)?.find(entry => options.match(change, entry.value));
      if (hint) { hint.cancel(); remove(hints, connection, hint); release(connection); options.resolve(change, hint.value); return; }
      const entry: Waiting<Change> = { value: change, cancel: clock.schedule(() => { remove(changes, connection, entry); options.resolve(change, null); }, hold) };
      changes.set(connection, [...changes.get(connection) ?? [], entry]);
    },
    /** @param connection - Connection key. @param hint - Hint received on that connection. */
    hint(connection: string, hint: ActivityHint): void {
      const change = changes.get(connection)?.find(entry => options.match(entry.value, hint));
      if (change) { release(connection, change); change.cancel(); remove(changes, connection, change); options.resolve(change.value, hint); return; }
      const entry: Waiting<ActivityHint> = { value: hint, cancel: clock.schedule(() => remove(hints, connection, entry), hold) };
      hints.set(connection, [...hints.get(connection) ?? [], entry]);
    },
    /** @param connection - Closed connection; its waiting changes resolve without hints. */
    close(connection: string): void {
      for (const entry of hints.get(connection) ?? []) entry.cancel();
      hints.delete(connection);
      release(connection);
    },
  };
}
