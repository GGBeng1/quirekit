import type { ActivityActor, ActivityEvent } from "../protocol/types";

/** Events by one actor close together in time, shown as one entry that expands to all of them. */
export interface ActivityGroup {
  /** Identity of the newest event in the group. */
  readonly id: string;
  /** Actor shared by the group. */
  readonly actor: ActivityActor;
  /** Newest event, shown as the entry. */
  readonly lead: ActivityEvent;
  /** All events, newest first, including the lead. */
  readonly events: readonly ActivityEvent[];
}

/** One calendar day in the viewer's time zone. */
export interface ActivityDay {
  /** `YYYY-MM-DD` in the projection time zone. */
  readonly date: string;
  /** Groups, newest first. */
  readonly groups: readonly ActivityGroup[];
}

/** Display grouping options; they never change stored events. */
export interface ActivityGroupingOptions {
  /** Largest gap between neighbors of one group, in milliseconds; default two minutes. */
  readonly gapMs?: number | undefined;
  /** IANA time zone deciding the calendar day; default the runtime zone. */
  readonly timeZone?: string | undefined;
}
