import type { ActivityStore, PendingActivityEvent } from "../protocol/types";
import type { ActivityOutbox } from "./types";

/** @returns An in-process outbox; the host persists what it takes together with the document state. */
export function createActivityOutbox(): ActivityOutbox {
  const pending = new Map<string, PendingActivityEvent[]>();
  return {
    add(key, events) { if (events.length) pending.set(key, [...pending.get(key) ?? [], ...events]); },
    take(key) { const events = pending.get(key) ?? []; pending.delete(key); return events; },
    restore(key, events) { if (events.length) pending.set(key, [...events, ...pending.get(key) ?? []]); },
    size(key) { return pending.get(key)?.length ?? 0; },
  };
}

/**
 * Appends a document's pending events after the document was stored. Simpler than a shared transaction, but a crash
 * between the two writes can lose these events; failed appends are put back for the next attempt.
 * @param outbox - Pending events.
 * @param key - Document key.
 * @param store - Host activity store.
 * @returns Completion of the append.
 */
export async function flushActivityOutbox(outbox: ActivityOutbox, key: string, store: ActivityStore): Promise<void> {
  const events = outbox.take(key);
  if (!events.length) return;
  try { await store.append(events); } catch (error) { outbox.restore(key, events); throw error; }
}
