import { v4 as uuidv4 } from "uuid";
import type { Doc } from "yjs";
import type { ActivityActor, PendingActivityEvent } from "@quirekit/edit-history";
import { createActivityCoalescer, createActivityOutbox, createHintPairing, createSessionTracker, decodeActivityHint, flushActivityOutbox,
  systemClock, type ActivityHint } from "@quirekit/edit-history/writer";
import { plausibleHint } from "./plausible";
import { locateChange, relativeRange, type SourceChange } from "./text";
import { diffThreads, snapshotThreads, type ThreadSnapshot } from "./comments";
import type { ActivityHookPayload, MsfeActivityServerOptions } from "./types";

/** An observed change with its author, document order and anchor, before it becomes an event. */
interface Candidate extends SourceChange {
  /** Room. */ readonly documentName: string;
  /** Authenticated author. */ readonly actor: ActivityActor;
  /** Per-room order of the first and last merged changes; merging requires consecutive order. */ readonly first: number; readonly last: number;
  /** Source before the first and after the last merged change. */ readonly baseline: string; readonly result: string;
  /** Anchors of the covered range. */ readonly anchor: { readonly from: string; readonly to: string };
  /** Characters inserted and deleted over all merged changes. */ readonly insertedCount: number; readonly deletedCount: number;
  /** Paired editor hint, when one was plausible. */ readonly hint: ActivityHint | null;
}

/**
 * Hocuspocus extension that confirms MSFE activity on the server: it pairs editor hints with the updates each
 * authenticated connection sends, checks them, merges typing, records joins and leaves, and keeps events in an
 * outbox the host persists with the document. It is the only writer, so replays and reconnects never duplicate.
 * @param options - Identity, document mapping, persistence mode and timing.
 * @returns Extension hooks plus `takeActivity` / `restoreActivity` for the host's store transaction.
 */
export function createMsfeActivityExtension<Context = unknown>(options: MsfeActivityServerOptions<Context>) {
  const clock = options.clock ?? systemClock, field = options.field ?? "source", limit = options.maxContentBytes ?? 4096;
  const outbox = createActivityOutbox(), shadows = new Map<string, { text: string; order: number }>();
  const sockets = new Map<string, { documentName: string; actor: ActivityActor }>(), trackers = new Map<string, ReturnType<typeof createSessionTracker>>();
  const threads = new Map<string, Map<string, ThreadSnapshot>>(), comments = options.commentsRoom ?? (() => false);
  /** @param documentName - Room. @param event - Event fields without the room identity. */
  const record = (documentName: string, event: Omit<PendingActivityEvent, "documentId" | "epoch">): void => {
    const identity = options.resolveDocument(documentName);
    if (identity) outbox.add(documentName, [{ ...identity, ...event }]);
  };
  /** @param candidate - Finished candidate. Fragments come from the burst's own baseline and result, never later text. */
  const emit = (candidate: Candidate): void => {
    const located = candidate.first === candidate.last ? candidate : { ...candidate, ...locateChange(candidate.baseline, candidate.result, limit) };
    const hint = candidate.hint;
    record(candidate.documentName, { operationId: hint?.operationId ?? uuidv4(), actor: candidate.actor, source: "human",
      kind: hint?.kind ?? "text.edit", kindVersion: hint?.kindVersion ?? 1, facts: { ...hint?.facts, inserted: candidate.insertedCount, deleted: candidate.deletedCount },
      occurredAt: hint?.occurredAt ?? new Date(candidate.at).toISOString(), sessionId: candidate.socket,
      target: { scheme: "yjs-relative", value: candidate.anchor, quote: (located.after || located.before).slice(0, 80) },
      content: { format: "markdown", before: located.before, after: located.after, truncated: located.truncated } });
  };
  const coalescer = createActivityCoalescer<Candidate>({ mergeMs: options.mergeMs, clock, emit,
    canMerge: (open, next) => next.first === open.last + 1 && next.from <= open.to + 1 && next.to + 1 >= open.from,
    merge: (open, next) => ({ ...next, first: open.first, baseline: open.baseline, at: open.at,
      from: Math.min(open.from, next.from), to: Math.max(open.to, next.to),
      anchor: { from: open.from <= next.from ? open.anchor.from : next.anchor.from, to: open.to >= next.to ? open.anchor.to : next.anchor.to },
      insertedCount: open.insertedCount + next.insertedCount, deletedCount: open.deletedCount + next.deletedCount }) });
  const pairing = createHintPairing<Candidate>({ holdMs: options.holdMs, clock, match: (change, hint) => hint.delta === change.delta,
    resolve(change, hint) {
      const valid = hint && plausibleHint(hint, change) ? hint : null;
      coalescer.push(change.socket, { ...change, hint: valid }, valid === null);
    } });
  /** @param documentName - Room. @returns Its session tracker. */
  const tracker = (documentName: string) => {
    let entry = trackers.get(documentName);
    if (!entry) trackers.set(documentName, entry = createSessionTracker({ graceMs: options.graceMs, clock,
      emit: (kind, actor, at) => record(documentName, { operationId: uuidv4(), actor, source: "system", kind, kindVersion: 1, facts: {},
        occurredAt: new Date(at).toISOString() }) }));
    return entry;
  };
  /**
   * Records comment actions by diffing the comment room against its last snapshot. Authors come from the connection,
   * never from the message fields; host or server writes only move the snapshot.
   * @param documentName - Comment room. @param document - Room document after the update. @param socketId - Sending connection.
   */
  const recordComments = (documentName: string, document: Doc, socketId: string | undefined): void => {
    const before = threads.get(documentName) ?? new Map(), after = snapshotThreads(document);
    threads.set(documentName, after);
    const socket = socketId ? sockets.get(socketId) : undefined;
    if (!socket || socket.documentName !== documentName) return;
    for (const change of diffThreads(document, before, after)) {
      const body = change.body === undefined ? undefined : locateChange("", change.body, limit);
      record(documentName, { operationId: uuidv4(), actor: socket.actor, source: "human", kind: change.kind, kindVersion: 1,
        facts: { threadId: change.threadId }, occurredAt: new Date(clock.now()).toISOString(), sessionId: socketId,
        target: { scheme: "comment-thread", value: { threadId: change.threadId }, ...(change.quote ? { quote: change.quote.slice(0, 80) } : {}) },
        ...(body ? { content: { format: "markdown", after: body.after, truncated: body.truncated } } : {}) });
    }
  };
  /** @param documentName - Room. @param document - Loaded document. @returns Remembered source text and order. */
  const shadow = (documentName: string, document: Doc) => {
    let entry = shadows.get(documentName);
    if (!entry) shadows.set(documentName, entry = { text: document.getText(field).toString(), order: 0 });
    return entry;
  };
  return {
    extensionName: "msfe-activity",
    /** @param data - Loaded room. Starts the source baseline before any client update. */
    async afterLoadDocument(data: ActivityHookPayload<Context>) {
      if (!data.document) return;
      if (comments(data.documentName)) threads.set(data.documentName, snapshotThreads(data.document));
      else shadow(data.documentName, data.document);
    },
    /** @param data - Authenticated connection. */
    async connected(data: ActivityHookPayload<Context>) {
      const actor = data.context === undefined ? null : options.resolveActor(data.context);
      if (!actor || !data.socketId || !options.resolveDocument(data.documentName)) return;
      sockets.set(data.socketId, { documentName: data.documentName, actor });
      // The comment room shares the source room's session, so joins are recorded once.
      if (!comments(data.documentName)) tracker(data.documentName).connect(actor, data.socketId);
    },
    /** @param data - Closed connection; its waiting changes resolve and its typing is emitted. */
    async onDisconnect(data: ActivityHookPayload<Context>) {
      const socket = data.socketId && sockets.get(data.socketId);
      if (!socket || !data.socketId) return;
      pairing.close(data.socketId); coalescer.flush(data.socketId); sockets.delete(data.socketId);
      if (!comments(socket.documentName)) tracker(socket.documentName).disconnect(socket.actor.id, data.socketId);
    },
    /** @param data - Applied update and its connection. Host or server changes move the baseline without a record. */
    async onChange(data: ActivityHookPayload<Context>) {
      if (!data.document) return;
      if (comments(data.documentName)) { recordComments(data.documentName, data.document, data.socketId); return; }
      const entry = shadow(data.documentName, data.document), previous = entry.text, next = data.document.getText(field).toString();
      if (previous === next) return;
      entry.text = next; entry.order++;
      const socket = data.socketId ? sockets.get(data.socketId) : undefined;
      const change = locateChange(previous, next, limit);
      if (!socket || !change || socket.documentName !== data.documentName) return;
      pairing.change(data.socketId!, { ...change, socket: data.socketId!, at: clock.now(), documentName: data.documentName, actor: socket.actor,
        first: entry.order, last: entry.order, baseline: previous, result: next, anchor: relativeRange(data.document.getText(field), change.from, change.to),
        insertedCount: change.inserted.length, deletedCount: change.deleted, hint: null });
    },
    /** @param data - Stateless message; activity hints are taken, other messages are left to their owners. */
    async onStateless(data: ActivityHookPayload<Context>) {
      const socketId = data.connection?.socketId ?? data.socketId, hint = data.payload === undefined ? null : decodeActivityHint(data.payload);
      if (hint && socketId && sockets.has(socketId)) pairing.hint(socketId, hint);
    },
    /** @param data - Stored room. In simple mode, pending events are appended after the document was stored. */
    async afterStoreDocument(data: ActivityHookPayload<Context>) {
      if (options.store) await flushActivityOutbox(outbox, data.documentName, options.store).catch(options.onError ?? console.error);
    },
    /** @param data - Unloaded room; its baseline is released. Sessions stay tracked so a reconnect within the grace window continues them. */
    async afterUnloadDocument(data: ActivityHookPayload<Context>) { shadows.delete(data.documentName); threads.delete(data.documentName); },
    /** @param documentName - Room being stored. @returns Pending events to write in the same transaction as the document. */
    takeActivity: (documentName: string) => outbox.take(documentName),
    /** @param documentName - Room. @param events - Events whose transaction failed, kept for the next store. */
    restoreActivity: (documentName: string, events: readonly PendingActivityEvent[]) => outbox.restore(documentName, events),
    /** Emits all collecting typing, e.g. before a test assertion or shutdown. */
    flushTyping: () => coalescer.flushAll(),
  };
}
