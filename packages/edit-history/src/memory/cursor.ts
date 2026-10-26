import type { ActivityFilter } from "../protocol/types";

/** Decoded continuation: the filter it belongs to, the snapshot bound and the last returned sequence. */
export interface MemoryCursor {
  /** Normalized filter identity. */
  readonly filter: string;
  /** Highest sequence visible when the listing started. */
  readonly asOf: number;
  /** Sequence of the last item already returned. */
  readonly before: number;
}

/** @param filter - Query filter. @returns Order-independent identity of the conditions. */
export function filterKey(filter: ActivityFilter | undefined): string {
  if (!filter) return "{}";
  const sorted = (list?: readonly string[]) => (list ? [...list].sort() : undefined);
  return JSON.stringify({ actors: sorted(filter.actors), kinds: sorted(filter.kinds), sources: sorted(filter.sources),
    system: filter.system ?? true, since: filter.since, until: filter.until });
}

/** @param cursor - Continuation fields. @returns Opaque token. */
export function encodeCursor(cursor: MemoryCursor): string {
  return btoa(encodeURIComponent(JSON.stringify(cursor)));
}

/** @param token - Opaque token. @param filter - Filter of the current request. @returns Decoded fields. @throws When the token is malformed or belongs to another filter. */
export function decodeCursor(token: string, filter: string): MemoryCursor {
  let cursor: MemoryCursor;
  try { cursor = JSON.parse(decodeURIComponent(atob(token))) as MemoryCursor; } catch { throw new TypeError("invalid activity cursor"); }
  if (cursor.filter !== filter || !Number.isInteger(cursor.asOf) || !Number.isInteger(cursor.before)) throw new TypeError("activity cursor does not match this query");
  return cursor;
}
