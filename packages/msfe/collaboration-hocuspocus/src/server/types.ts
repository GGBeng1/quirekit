import type { ActivityActor, ActivityStore } from "@quirekit/edit-history";
import type { WriterClock } from "@quirekit/edit-history/writer";
import type { Doc } from "yjs";

/** Host decisions for confirming MSFE activity on a Hocuspocus server. */
export interface MsfeActivityServerOptions<Context = unknown> {
  /** @param context - Connection context set by authentication. @returns The authenticated actor, or null to record nothing for it. */
  readonly resolveActor: (context: Context) => ActivityActor | null;
  /** @param documentName - Hocuspocus room. @returns Host document identity and generation, or null for rooms without activity. */
  readonly resolveDocument: (documentName: string) => { readonly documentId: string; readonly epoch: string } | null;
  /** @param documentName - Hocuspocus room. @returns Whether it is the document's comment room rather than its source room. */
  readonly commentsRoom?: ((documentName: string) => boolean) | undefined;
  /** Shared text holding the Markdown source; default `source`. */
  readonly field?: string | undefined;
  /** Appends after each document store (simple mode). Omit to take events with `takeActivity` inside the host's own store transaction. */
  readonly store?: ActivityStore | undefined;
  /** Typing pause that ends one entry; default 3000 ms. */
  readonly mergeMs?: number | undefined;
  /** How long a change waits for its editor hint; default 1000 ms. */
  readonly holdMs?: number | undefined;
  /** Reconnect window that continues a session; default 60000 ms. */
  readonly graceMs?: number | undefined;
  /** Byte limit of each before/after fragment; default 4096. */
  readonly maxContentBytes?: number | undefined;
  /** @param error - Store failure in simple mode; events stay pending for the next store. */
  readonly onError?: ((error: unknown) => void) | undefined;
  /** Time source and timers, for tests. */
  readonly clock?: WriterClock | undefined;
}

/** Fields of Hocuspocus hook payloads this extension reads; structurally compatible with `@hocuspocus/server`. */
export interface ActivityHookPayload<Context = unknown> {
  /** Room name. */
  readonly documentName: string;
  /** Connection context from authentication. */
  readonly context?: Context;
  /** Connection identity. */
  readonly socketId?: string;
  /** Loaded document. */
  readonly document?: Doc;
  /** Stateless message text. */
  readonly payload?: string;
  /** Connection that sent a stateless message. */
  readonly connection?: { readonly socketId?: string; readonly context?: Context } | undefined;
}
