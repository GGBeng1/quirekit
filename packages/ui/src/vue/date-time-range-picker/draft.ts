import type { DateTimeDraft, DateTimeRules } from '../date-time-picker/types';
import { draftDateTime } from '../date-time-picker/draft';
import { dateTimeError } from '../date-time-picker/rules';

/**
 * Advances new range endpoints only after every required unit is explicitly chosen.
 * Editing a complete endpoint stays in place so subsequent units remain editable.
 * @param previous - Draft before this user action.
 * @param next - Draft after this user action; never mutated or filled implicitly.
 * @param rules - This endpoint's precision and availability constraints.
 * @param cycle - Displayed clock cycle, including an explicit period in 12-hour mode.
 * @returns Whether an incomplete endpoint has just become complete and valid.
 */
export function completesEndpoint(previous: DateTimeDraft, next: DateTimeDraft, rules: DateTimeRules, cycle: 12 | 24): boolean {
  const precision = rules.granularity ?? 'second';
  const value = draftDateTime(next, cycle, precision);
  return draftDateTime(previous, cycle, precision) === null && value !== null && !dateTimeError(value, rules);
}
