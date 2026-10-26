import { assertPendingEvent } from "../protocol/validate";
import type { ActivityEvent, ActivityPage, ActivityQuery, ActivityReceipt, ActivityStore, CompactionReport, PendingActivityEvent, RetentionPolicy } from "../protocol/types";
import { decodeCursor, encodeCursor, filterKey } from "./cursor";
import { matchesFilter } from "./filter";
import type { MemoryStoreOptions } from "./types";

const day = 86_400_000;

/** Per-document confirmed log. */
interface DocumentLog {
  /** Events in ascending sequence; compaction may remove old ones. */
  events: ActivityEvent[];
  /** Confirmed events by idempotency key. */
  readonly operations: Map<string, ActivityEvent>;
  /** Last assigned sequence; never reused, even after removal. */
  last: number;
  /** Live subscribers. */
  readonly listeners: Set<(event: ActivityEvent) => void>;
}

/**
 * In-memory reference implementation of the protocol. Nothing survives a reload; use it for
 * demos, tests and as the behavior the conformance suite expects from real stores.
 * @param options - Clock, identity and access policy.
 * @returns An activity store plus a raw view for diagnostics.
 */
export function createMemoryActivityStore(options: MemoryStoreOptions = {}): ActivityStore & { readonly snapshot: (documentId: string) => readonly ActivityEvent[] } {
  const now = options.now ?? (() => new Date());
  const visible = options.canView ?? (() => true);
  const logs = new Map<string, DocumentLog>(), byId = new Map<string, ActivityEvent>();
  let counter = 0;
  /** @param documentId - Document. @returns Its log, created on first use. */
  const log = (documentId: string): DocumentLog => {
    let entry = logs.get(documentId);
    if (!entry) logs.set(documentId, entry = { events: [], operations: new Map(), last: 0, listeners: new Set() });
    return entry;
  };
  /** @param event - Stored event. @param replacement - Updated event, or null to remove it. */
  const replace = (event: ActivityEvent, replacement: ActivityEvent | null): void => {
    const entry = log(event.documentId), index = entry.events.indexOf(event);
    if (replacement) { entry.events[index] = replacement; byId.set(event.id, replacement); entry.operations.set(event.operationId, replacement); }
    else { entry.events.splice(index, 1); byId.delete(event.id); }
  };
  const store = {
    async append(pending: readonly PendingActivityEvent[]): Promise<readonly ActivityReceipt[]> {
      // Validate the whole batch first so a bad event never leaves a partial append.
      const checked = pending.map(assertPendingEvent);
      const confirmed: ActivityEvent[] = [];
      const receipts = checked.map(input => {
        const entry = log(input.documentId), known = entry.operations.get(input.operationId);
        if (known) return { operationId: known.operationId, id: known.id, sequence: known.sequence, acceptedAt: known.acceptedAt, duplicate: true };
        const event: ActivityEvent = Object.freeze({ ...structuredClone(input), formatVersion: 1 as const,
          id: options.createId?.() ?? `activity-${++counter}`, sequence: ++entry.last, acceptedAt: now().toISOString(), retention: "full" as const });
        entry.events.push(event); entry.operations.set(event.operationId, event); byId.set(event.id, event); confirmed.push(event);
        return { operationId: event.operationId, id: event.id, sequence: event.sequence, acceptedAt: event.acceptedAt, duplicate: false };
      });
      for (const event of confirmed) for (const listener of [...log(event.documentId).listeners]) listener(event);
      if (options.retention && confirmed.length) await store.compact(options.retention);
      return receipts;
    },
    async list(query: ActivityQuery): Promise<ActivityPage<ActivityEvent>> {
      if (!Number.isInteger(query.limit) || query.limit < 1) throw new RangeError("activity list limit must be a positive integer");
      const key = filterKey(query.filter), entry = log(query.documentId);
      const cursor = query.cursor ? decodeCursor(query.cursor, key) : { filter: key, asOf: entry.last, before: entry.last + 1 };
      const items: ActivityEvent[] = [];
      let more = false;
      for (let index = entry.events.length - 1; index >= 0; index--) {
        const event = entry.events[index]!;
        if (event.sequence >= cursor.before || event.sequence > cursor.asOf) continue;
        if (!matchesFilter(event, query.filter) || !visible(query.viewer, event)) continue;
        if (items.length === query.limit) { more = true; break; }
        items.push(event);
      }
      return { items, ...(more ? { cursor: encodeCursor({ filter: key, asOf: cursor.asOf, before: items.at(-1)!.sequence }) } : {}) };
    },
    async get(id: string, viewer?: string): Promise<ActivityEvent | null> {
      const event = byId.get(id);
      return event && visible(viewer, event) ? event : null;
    },
    subscribe(documentId: string, afterSequence: number, listener: (event: ActivityEvent) => void): () => void {
      const entry = log(documentId);
      /** @param event - Newly confirmed event. */
      const forward = (event: ActivityEvent): void => { if (event.sequence > afterSequence) listener(event); };
      entry.listeners.add(forward);
      return () => { entry.listeners.delete(forward); };
    },
    async compact(policy: RetentionPolicy, at = now()): Promise<CompactionReport> {
      let summarized = 0, removed = 0;
      const fullBefore = new Date(at.getTime() - policy.fullDays * day).toISOString();
      const removeBefore = policy.summaryDays === undefined ? undefined : new Date(at.getTime() - policy.summaryDays * day).toISOString();
      for (const entry of logs.values()) {
        // Events are in ascending order, so the oldest ones exceed the per-document cap.
        const excess = policy.maxEvents === undefined ? 0 : Math.max(0, entry.events.length - policy.maxEvents);
        for (const [index, event] of [...entry.events].entries()) {
          if (index < excess || (removeBefore && event.acceptedAt < removeBefore)) { replace(event, null); removed++; }
        else if (event.retention === "full" && event.acceptedAt < fullBefore) {
          const { content: _content, ...rest } = event;
          replace(event, Object.freeze({ ...rest, retention: "summary" as const })); summarized++;
          }
        }
      }
      return { summarized, removed, versionsRemoved: 0 };
    },
    snapshot: (documentId: string) => [...log(documentId).events],
  };
  return store;
}
