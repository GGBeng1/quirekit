import { describe, expect, it } from 'vitest';
import { completesEndpoint } from './draft';
import { dateTimeDraft } from '../date-time-picker/draft';

describe('sequential date-time completion', () => {
  it('requires explicit time units; a date cannot silently select midnight', () => {
    const empty = dateTimeDraft(null, 24);
    const date = { ...empty, date: '2026-09-07' };
    const hour = { ...date, time: { ...date.time, hour: 9 } };
    const minute = { ...hour, time: { ...hour.time, minute: 30 } };
    expect(completesEndpoint(empty, date, { granularity: 'minute' }, 24)).toBe(false);
    expect(completesEndpoint(date, hour, { granularity: 'minute' }, 24)).toBe(false);
    expect(completesEndpoint(hour, minute, { granularity: 'minute' }, 24)).toBe(true);
    expect(date.time.hour).toBeNull();
    expect(completesEndpoint(hour, minute, { granularity: 'second' }, 24)).toBe(false);
    expect(completesEndpoint(minute, { ...minute, time: { ...minute.time, second: 0 } }, {}, 24)).toBe(true);
  });
  it('accepts date-last selection and requires the 12-hour period and availability', () => {
    const complete = dateTimeDraft('2026-09-07 13:45', 12);
    const timeOnly = { ...complete, date: null };
    expect(completesEndpoint(timeOnly, complete, { granularity: 'minute' }, 12)).toBe(true);
    expect(completesEndpoint(timeOnly, { ...complete, time: { ...complete.time, period: null } }, { granularity: 'minute' }, 12)).toBe(false);
    expect(completesEndpoint(timeOnly, complete, { granularity: 'minute', min: '2026-09-07 14:00' }, 12)).toBe(false);
    expect(completesEndpoint(timeOnly, complete, { granularity: 'minute', minuteStep: 30 }, 12)).toBe(false);
  });
  it('keeps an existing endpoint active while editing individual units', () => {
    const complete = dateTimeDraft('2026-09-07 09:30', 24);
    expect(completesEndpoint(complete, dateTimeDraft('2026-09-08 10:30', 24), { granularity: 'minute' }, 24)).toBe(false);
  });
});
