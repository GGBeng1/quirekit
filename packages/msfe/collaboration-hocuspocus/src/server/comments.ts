import { Map as YMap, type Doc } from "yjs";

/** What the server remembers about one comment thread between updates. */
export interface ThreadSnapshot {
  /** Whether the thread is resolved. */ readonly resolved: boolean;
  /** Message identities. */ readonly messages: ReadonlySet<string>;
}

/** A comment action derived from a comment room update. */
export interface CommentChange {
  /** `comment.add`, `comment.reply`, `comment.resolve`, `comment.reopen` or `comment.remove`. */ readonly kind: string;
  /** Thread identity. */ readonly threadId: string;
  /** Body of the new message, when the action added one. */ readonly body?: string | undefined;
  /** Commented text, when the thread has a text anchor. */ readonly quote?: string | undefined;
}

/** @param value - Untrusted value. @returns Whether it is a non-array object. */
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

/**
 * Reads the comment room layout written by `@quirekit/msfe-comments` (`threads` → per-thread map with `anchor`,
 * `resolution` and a `messages` map). Only identities and flags are read; validation stays with the comments package.
 * @param room - Comment room document.
 * @returns Snapshot of every thread.
 */
export function snapshotThreads(room: Doc): Map<string, ThreadSnapshot> {
  const result = new Map<string, ThreadSnapshot>();
  for (const [id, value] of room.getMap("threads").entries()) {
    if (!(value instanceof YMap)) continue;
    const resolution = value.get("resolution"), messages = value.get("messages");
    result.set(id, { resolved: record(resolution) && resolution.resolved === true, messages: new Set(messages instanceof YMap ? messages.keys() : []) });
  }
  return result;
}

/**
 * @param room - Comment room after the update.
 * @param before - Snapshot before the update.
 * @param after - Snapshot after the update.
 * @returns Actions in reading order: removals, then per thread its creation or replies and resolution changes.
 */
export function diffThreads(room: Doc, before: ReadonlyMap<string, ThreadSnapshot>, after: ReadonlyMap<string, ThreadSnapshot>): CommentChange[] {
  const changes: CommentChange[] = [], threads = room.getMap("threads");
  for (const id of before.keys()) if (!after.has(id)) changes.push({ kind: "comment.remove", threadId: id });
  for (const [id, thread] of after) {
    const previous = before.get(id), map = threads.get(id) as YMap<unknown>, messages = map.get("messages") as YMap<unknown> | undefined;
    const anchor = map.get("anchor"), quote = record(anchor) && record(anchor.quote) && typeof anchor.quote.exact === "string" ? anchor.quote.exact : undefined;
    /** @param key - Message identity. @returns Its body, when readable. */
    const body = (key: string): string | undefined => { const message = messages?.get(key); return record(message) && typeof message.body === "string" ? message.body : undefined; };
    const added = [...thread.messages].filter(key => !previous?.messages.has(key));
    if (!previous) changes.push({ kind: "comment.add", threadId: id, body: added.map(body).find(Boolean), quote });
    else for (const key of added) changes.push({ kind: "comment.reply", threadId: id, body: body(key), quote });
    if (previous && previous.resolved !== thread.resolved) changes.push({ kind: thread.resolved ? "comment.resolve" : "comment.reopen", threadId: id, quote });
  }
  return changes;
}
