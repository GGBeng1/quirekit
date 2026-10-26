/** Semantic event status; business transitions remain owned by the host. */
export type QuireKitTimelineStatus = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/** One immutable record in the host's chosen chronological order. */
export interface QuireKitTimelineItem {
  /** Unique identity retained when records are inserted or reordered. */
  readonly key: string;
  /** Human-readable event heading. */
  readonly title: string;
  /** Supporting detail, rendered as literal text. */
  readonly description?: string;
  /** Already formatted time label; the component does not choose a locale or time zone. */
  readonly time?: string;
  /** Valid HTML datetime value, supplied separately from the display label. */
  readonly dateTime?: string;
  /** Semantic indicator and default status label; omission renders a neutral ring without a label. */
  readonly status?: QuireKitTimelineStatus;
  /** Override the status text; an empty string intentionally hides it. */
  readonly statusLabel?: string;
  /** Registered decorative icon name; the indicator slot takes precedence. */
  readonly icon?: string;
}

/** Readonly ordered history with responsive time labels and composable details. */
export interface QuireKitTimelineProps {
  /** Events in the order chosen by the host. */
  readonly items: readonly QuireKitTimelineItem[];
  /** Accessible name of the event list; defaults to the language pack. */
  readonly label?: string;
  /** Reverse the rendered and accessible reading order without mutating items. */
  readonly reverse?: boolean;
  /** Record spacing and typography, independent of nested control size. Defaults to regular. */
  readonly density?: 'regular' | 'compact';
  /** Place time above the title or in a separate column when the container is at least 32rem. */
  readonly timePosition?: 'inline' | 'aside';
  /** Preferred aside time width, capped at 30% of the container. Defaults to 9em. */
  readonly timeWidth?: string;
}

/** Context retains the original array index even when the list is reversed. */
export interface QuireKitTimelineItemContext {
  /** Original event object. */
  readonly item: QuireKitTimelineItem;
  /** Index in the original items array. */
  readonly index: number;
}

/** Content slots preserve the native ordered list and its time semantics. */
export interface QuireKitTimelineSlots {
  /** Decorative content for the 24px node area, such as an xs Avatar; keep interactive controls in content. */
  readonly indicator?: (context: QuireKitTimelineItemContext) => unknown;
  /** Display label within the native time element when dateTime is provided. */
  readonly time?: (context: QuireKitTimelineItemContext) => unknown;
  /** Event heading content. */
  readonly title?: (context: QuireKitTimelineItemContext) => unknown;
  /** Supporting event description. */
  readonly description?: (context: QuireKitTimelineItemContext) => unknown;
  /** Additional details and host-owned actions below the description. */
  readonly content?: (context: QuireKitTimelineItemContext) => unknown;
  /** Empty-list content; no fake event is inserted. */
  readonly empty?: () => unknown;
}
