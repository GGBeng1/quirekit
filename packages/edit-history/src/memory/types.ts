import type { ActivityEvent, RetentionPolicy } from "../protocol/types";

/** Options of the in-memory reference stores. */
export interface MemoryStoreOptions {
  /** @returns Current time; tests pass a controlled clock. */
  readonly now?: () => Date;
  /** @returns A new record identity; defaults to a per-store counter. */
  readonly createId?: () => string;
  /**
   * Access policy applied to lists, reads and counts.
   * @param viewer - Caller identity from the query.
   * @param event - Candidate event.
   * @returns Whether the caller may see it.
   */
  readonly canView?: (viewer: string | undefined, event: ActivityEvent) => boolean;
  /** Applied after every append, so the store never grows past the policy (useful for demos and bounded servers). */
  readonly retention?: RetentionPolicy | undefined;
}
