import type { ActivityEvent } from "../protocol/types";
import type { ActivityDay, ActivityGroup, ActivityGroupingOptions } from "./types";

/**
 * Projects events into days and time-adjacent groups for a timeline. Grouping is display only:
 * every event stays in its group, and actors, sessions and days never mix.
 * @param events - Confirmed events in any order, typically loaded pages.
 * @param options - Gap and time zone.
 * @returns Days newest first.
 */
export function groupActivities(events: readonly ActivityEvent[], options: ActivityGroupingOptions = {}): readonly ActivityDay[] {
  const gap = options.gapMs ?? 120_000;
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: options.timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const days: { date: string; groups: { events: ActivityEvent[] }[] }[] = [];
  let previous: ActivityEvent | undefined;
  for (const event of [...events].sort((a, b) => b.sequence - a.sequence)) {
    const date = format.format(new Date(event.acceptedAt));
    let current = days.at(-1);
    if (current?.date !== date) days.push(current = { date, groups: [] });
    const group = current.groups.at(-1);
    // Sequence order is authoritative; time only decides whether neighbors read as one entry.
    const joins = group && previous && previous.actor.id === event.actor.id && previous.sessionId === event.sessionId
      && Date.parse(previous.acceptedAt) - Date.parse(event.acceptedAt) <= gap;
    if (joins) group.events.push(event); else current.groups.push({ events: [event] });
    previous = event;
  }
  return days.map(entry => ({ date: entry.date, groups: entry.groups.map((group): ActivityGroup => ({
    id: group.events[0]!.id, actor: group.events[0]!.actor, lead: group.events[0]!, events: group.events })) }));
}
