import { isSystemKind, kindMatches } from "../protocol/kinds";
import type { ActivityEvent, ActivityFilter } from "../protocol/types";

/** @param event - Confirmed event. @param filter - Query conditions. @returns Whether every present condition matches. */
export function matchesFilter(event: ActivityEvent, filter: ActivityFilter | undefined): boolean {
  if (!filter) return true;
  if (filter.actors && !filter.actors.includes(event.actor.id)) return false;
  if (filter.kinds && !filter.kinds.some(kind => kindMatches(event.kind, kind))) return false;
  if (filter.sources && !filter.sources.includes(event.source)) return false;
  if (filter.system === false && isSystemKind(event.kind)) return false;
  if (filter.since && event.acceptedAt < new Date(filter.since).toISOString()) return false;
  if (filter.until && event.acceptedAt >= new Date(filter.until).toISOString()) return false;
  return true;
}
