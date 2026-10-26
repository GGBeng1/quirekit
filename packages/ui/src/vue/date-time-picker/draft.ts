import { normalizeCivilDateTime } from './value';
import { draftTime, timeDraft } from '../time-picker/value';
import type { DateTimeDraft } from './types';

/** @param value - Complete civil fields or empty value. @param cycle - Display cycle. @returns Independent date and time-unit draft. */
export function dateTimeDraft(value: string | null, cycle: 12 | 24): DateTimeDraft {
  normalizeCivilDateTime(value);
  return { date: value?.slice(0, 10) ?? null, time: timeDraft(value?.slice(11) ?? null, cycle) };
}
/** @param draft - Partial editing fields. @param cycle - Display cycle. @param precision - Requested complete precision. @returns Complete civil value only when every required part exists. */
export function draftDateTime(draft: DateTimeDraft, cycle: 12 | 24, precision: 'minute' | 'second'): string | null {
  const clock = draftTime(draft.time, cycle, precision);
  return draft.date && clock ? `${draft.date} ${clock}` : null;
}
/** @param precision - Explicit visible precision. @returns Device civil fields at the instant of an explicit user action; no inferred timezone conversion. */
export function currentCivilDateTime(precision: 'minute' | 'second'): string {
  const now = new Date();
  const date = [String(now.getFullYear()).padStart(4, '0'), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const clock = [now.getHours(), now.getMinutes(), ...(precision === 'second' ? [now.getSeconds()] : [])].map(unit => String(unit).padStart(2, '0')).join(':');
  return `${date} ${clock}`;
}
