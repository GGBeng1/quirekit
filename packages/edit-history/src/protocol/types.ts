/** Record format version understood by this package. */
export type ActivityFormatVersion = 1;

/** Who caused an event; the identity is stable, the display fields are a snapshot. */
export interface ActivityActor {
  /** Stable host identity; renaming never changes it. */
  readonly id: string;
  /** Display name at the time of the event. */
  readonly name?: string | undefined;
  /** Avatar URL at the time of the event. */
  readonly avatar?: string | undefined;
  /** `verified` when an authenticated writer confirmed it, `local` for single-user records. */
  readonly trust: "verified" | "local";
}

/** Origin of an event. */
export type ActivitySource = "human" | "ai" | "import" | "system";

/** Operation-level relations, referencing other events by operationId. */
export interface ActivityRelations {
  /** Operation that this undo or redo reverses. */
  readonly undoes?: string | undefined;
  /** Root operation of which this event is a side effect. */
  readonly parent?: string | undefined;
}

/** Logical location; never screen coordinates. The scheme decides how `value` is resolved. */
export interface ActivityTarget {
  /** Anchor scheme, e.g. `source-range` or `yjs-relative`. */
  readonly scheme: string;
  /** Scheme-owned JSON value. */
  readonly value: unknown;
  /** Text near the target, used when the anchor alone cannot be resolved. */
  readonly quote?: string | undefined;
}

/** Bounded before/after content; the format tag decides how it is shown. */
export interface ActivityContent {
  /** Content format, e.g. `markdown` or `text`. */
  readonly format: string;
  /** Content before the change. */
  readonly before?: string | undefined;
  /** Content after the change. */
  readonly after?: string | undefined;
  /** Whether either side was cut at the writer's byte limit. */
  readonly truncated: boolean;
}

/** Event fields supplied by a writer; the store assigns identity, order and time. */
export interface PendingActivityEvent {
  /** Host document identity. */
  readonly documentId: string;
  /** Document generation; replacing or restoring the whole document starts a new epoch. */
  readonly epoch: string;
  /** Idempotency key; repeated appends with the same key return the original receipt. */
  readonly operationId: string;
  /** Who caused the event. */
  readonly actor: ActivityActor;
  /** Event origin. */
  readonly source: ActivitySource;
  /** Feature-named type such as `text.edit`, `comment.add` or `md.insert.highlight`. */
  readonly kind: string;
  /** Version of the kind's `facts` shape. */
  readonly kindVersion: number;
  /** Kind-owned JSON facts. */
  readonly facts: Readonly<Record<string, unknown>>;
  /** Client time of the change, when it differs meaningfully from acceptance (offline edits). */
  readonly occurredAt?: string | undefined;
  /** Editing session, used to keep display groups within one connection. */
  readonly sessionId?: string | undefined;
  /** Operation-level relations. */
  readonly related?: ActivityRelations | undefined;
  /** Logical location. */
  readonly target?: ActivityTarget | undefined;
  /** Bounded before/after content. */
  readonly content?: ActivityContent | undefined;
}

/** A confirmed event. Only `retention` may change later, dropping `content`. */
export interface ActivityEvent extends PendingActivityEvent {
  /** Record format version. */
  readonly formatVersion: ActivityFormatVersion;
  /** Store-assigned event identity. */
  readonly id: string;
  /** Store-assigned, gap-free order within the document; the only ordering authority. */
  readonly sequence: number;
  /** ISO 8601 UTC acceptance time. */
  readonly acceptedAt: string;
  /** `summary` after compaction removed the content. */
  readonly retention: "full" | "summary";
}

/** Result of appending one pending event. */
export interface ActivityReceipt {
  /** Echoed idempotency key. */
  readonly operationId: string;
  /** Confirmed event identity. */
  readonly id: string;
  /** Confirmed order. */
  readonly sequence: number;
  /** Confirmed time. */
  readonly acceptedAt: string;
  /** Whether the operation had already been confirmed by an earlier append. */
  readonly duplicate: boolean;
}

/** Conditions narrowing a list; all present conditions must match. */
export interface ActivityFilter {
  /** Restrict to these actor identities. */
  readonly actors?: readonly string[] | undefined;
  /** Restrict to kinds equal to, or nested under (`comment` matches `comment.add`), these names. */
  readonly kinds?: readonly string[] | undefined;
  /** Restrict to these sources. */
  readonly sources?: readonly ActivitySource[] | undefined;
  /** Include system kinds (sessions, versions); default true. */
  readonly system?: boolean | undefined;
  /** Inclusive lower bound of `acceptedAt`. */
  readonly since?: string | undefined;
  /** Exclusive upper bound of `acceptedAt`. */
  readonly until?: string | undefined;
}

/** Newest-first page request. */
export interface ActivityQuery {
  /** Document whose events are listed. */
  readonly documentId: string;
  /** Narrowing conditions; a cursor must be reused with the same filter. */
  readonly filter?: ActivityFilter | undefined;
  /** Opaque continuation from a previous page. */
  readonly cursor?: string | undefined;
  /** Maximum events on this page. */
  readonly limit: number;
  /** Caller identity checked by the store's access policy. */
  readonly viewer?: string | undefined;
}

/** One page of a stable, newest-first listing. */
export interface ActivityPage<T> {
  /** Items on this page. */
  readonly items: readonly T[];
  /** Continuation, absent on the last page. */
  readonly cursor?: string | undefined;
}

/** Host retention policy, passed as data. */
export interface RetentionPolicy {
  /** Days during which events keep their content. */
  readonly fullDays: number;
  /** Days after which events are removed entirely; omitted keeps summaries forever. */
  readonly summaryDays?: number | undefined;
  /** Newest events kept per document; older ones are removed regardless of age. */
  readonly maxEvents?: number | undefined;
  /** Automatic version thinning: older than `olderThanDays`, keep one per `keepEveryHours`. */
  readonly versionThinning?: readonly { readonly olderThanDays: number; readonly keepEveryHours: number }[] | undefined;
}

/** What a compaction pass changed. */
export interface CompactionReport {
  /** Events whose content was removed. */
  readonly summarized: number;
  /** Events removed after the summary period. */
  readonly removed: number;
  /** Automatic versions removed by thinning. */
  readonly versionsRemoved: number;
}

/** Storage-neutral activity store implemented by hosts. */
export interface ActivityStore {
  /**
   * Confirms events in order; idempotent per operationId.
   * @param events - Pending events from one writer.
   * @returns One receipt per event, in input order.
   */
  append(events: readonly PendingActivityEvent[]): Promise<readonly ActivityReceipt[]>;
  /**
   * Lists visible events newest first.
   * @param query - Document, filter, cursor and limit.
   * @returns A page and its continuation.
   */
  list(query: ActivityQuery): Promise<ActivityPage<ActivityEvent>>;
  /**
   * Reads one visible event.
   * @param id - Event identity.
   * @param viewer - Caller identity.
   * @returns The event, or null when absent or not visible.
   */
  get(id: string, viewer?: string): Promise<ActivityEvent | null>;
  /**
   * Streams events confirmed after a sequence.
   * @param documentId - Document to follow.
   * @param afterSequence - Last sequence already known.
   * @param listener - Receives each newly confirmed event.
   * @returns Unsubscribe function.
   */
  subscribe?(documentId: string, afterSequence: number, listener: (event: ActivityEvent) => void): () => void;
  /**
   * Applies a retention policy.
   * @param policy - Host retention data.
   * @param now - Reference time.
   * @returns Changes made.
   */
  compact?(policy: RetentionPolicy, now?: Date): Promise<CompactionReport>;
}

/** How a version came to exist. */
export type VersionTrigger = "auto" | "named" | "restore" | "import";

/** Fields supplied when creating a version. */
export interface PendingVersion {
  /** Host document identity. */
  readonly documentId: string;
  /** Document generation. */
  readonly epoch: string;
  /** Activity sequence the content corresponds to. */
  readonly sequence: number;
  /** Creator, when a person made it. */
  readonly actor?: ActivityActor | undefined;
  /** Named versions are kept permanently. */
  readonly name?: string | undefined;
  /** How the version came to exist. */
  readonly trigger: VersionTrigger;
}

/** Whole-document content of a version. */
export interface VersionContent {
  /** Content format, e.g. `markdown`. */
  readonly format: string;
  /** Serialized document. */
  readonly value: string;
}

/** A confirmed version; its content is stored by reference. */
export interface VersionRecord extends PendingVersion {
  /** Record format version. */
  readonly formatVersion: ActivityFormatVersion;
  /** Store-assigned identity. */
  readonly id: string;
  /** ISO 8601 UTC creation time. */
  readonly createdAt: string;
  /** Content reference, format, size and hash used for deduplication. */
  readonly content: { readonly ref: string; readonly format: string; readonly bytes: number; readonly hash: string };
}

/** Storage-neutral version store implemented by hosts. */
export interface VersionStore {
  /**
   * Creates a version; an unnamed version identical to the latest one reuses it.
   * @param version - Version fields.
   * @param content - Whole-document content.
   * @returns The new or reused record.
   */
  create(version: PendingVersion, content: VersionContent): Promise<VersionRecord>;
  /**
   * Lists versions newest first.
   * @param query - Document, cursor and limit.
   * @returns A page and its continuation.
   */
  list(query: { readonly documentId: string; readonly cursor?: string | undefined; readonly limit: number }): Promise<ActivityPage<VersionRecord>>;
  /**
   * Reads a version and its content.
   * @param id - Version identity.
   * @returns Record and content, or null.
   */
  read(id: string): Promise<{ readonly record: VersionRecord; readonly content: VersionContent } | null>;
  /**
   * Thins automatic versions; named, restore and import versions are kept.
   * @param policy - Host retention data.
   * @param now - Reference time.
   * @returns Changes made.
   */
  compact?(policy: RetentionPolicy, now?: Date): Promise<CompactionReport>;
}
