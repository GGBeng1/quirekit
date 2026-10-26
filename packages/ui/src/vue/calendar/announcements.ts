import { quireKitDefaultLocale } from "../../locale/resolve";
import type { Messages as CalendarMessages } from "../../locale/components/calendar";
import type { CalendarDayAnnouncement } from "./types";
/**
 * Names a date together with states that must not depend on color alone.
 * @param state - Ark's current date-cell state.
 * @param text - Calendar messages of the active language.
 * @returns A date announcement with selection and availability context.
 */
export function announceCalendarDay(state: CalendarDayAnnouncement, text: CalendarMessages = quireKitDefaultLocale.messages.calendar): string {
  const states = [state.today && text.today, !state.selectable && text.unavailable, state.firstInRange ? text.rangeStart : state.lastInRange ? text.rangeEnd : state.selected && text.selected];
  return [...states.filter(Boolean), state.valueText].join(text.separator);
}
