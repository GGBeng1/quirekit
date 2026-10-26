import { describe, expect, it } from 'vitest';
import { CalendarDateTime, parseZonedDateTime } from '@internationalized/date';
import { normalizeCivilDateTime, parseCivilDateTime, serializeCivilDateTime } from './value';
import { dateTimeError, dateTimeTimeRules } from './rules';
import { CivilDateTimeFormatter } from './formatter';
import { availableTimes, clockSeconds } from '../time-picker/value';

describe('civil date-time contract', () => {
  it('preserves leap days, midnight and calendar year boundaries without a zone', () => {
    for (const value of ['0001-01-01 00:00:00', '2024-02-29 23:59:59', '9999-12-31 23:59:59']) expect(normalizeCivilDateTime(value)).toBe(value);
    expect(normalizeCivilDateTime('2026-09-07 00:00')).toBe('2026-09-07 00:00:00');
    expect(normalizeCivilDateTime(null)).toBeNull();
    expect(parseCivilDateTime('2026-03-08 02:30:00')?.hour).toBe(2);
  });
  it('rejects malformed dates, zoned values, milliseconds and hidden seconds', () => {
    for (const value of ['0000-01-01 00:00', '2026-02-29 09:00', '2026-04-31 09:00', '2026-09-07', '2026-09-07T09:30:00Z', '2026-09-07 09:30:00+08:00', '2026-09-07 09:30:00.001', '2026-09-07 24:00:00']) expect(() => parseCivilDateTime(value)).toThrow();
    expect(() => normalizeCivilDateTime('2026-09-07 09:30:01', 'minute')).toThrow('non-zero seconds');
    expect(normalizeCivilDateTime('2026-09-07 09:30:00', 'minute')).toBe('2026-09-07 09:30');
    expect(() => serializeCivilDateTime(parseZonedDateTime('2026-09-07T09:30[Asia/Shanghai]'))).toThrow();
    expect(() => serializeCivilDateTime(new CalendarDateTime(2026, 9, 7, 9, 30, 0, 1))).toThrow();
  });
  it('formats compact padded date/time parts and preserves midnight/noon in 12-hour display', () => {
    const date = new Date('2026-09-07T00:05:09Z');
    expect(new CivilDateTimeFormatter('zh-CN', 'second', 24).format(date)).toBe('2026-09-07 00:05:09');
    expect(new CivilDateTimeFormatter('en-US', 'minute', 12).format(date)).toBe('2026-09-07 12:05 AM');
    expect(new CivilDateTimeFormatter('en-US', 'second', 12).format(new Date('2026-09-07T12:05:09Z'))).toBe('2026-09-07 12:05:09 PM');
  });
  it('projects min/max only onto boundary days, including second boundaries at minute precision', () => {
    const rules = { min: '2026-09-07 12:00:30', max: '2026-09-09 10:00:00', granularity: 'minute' as const };
    expect(availableTimes(dateTimeTimeRules('2026-09-07', rules))[0]).toBe(clockSeconds('12:01'));
    expect(availableTimes(dateTimeTimeRules('2026-09-08', rules))).toHaveLength(1440);
    expect(availableTimes(dateTimeTimeRules('2026-09-09', rules)).at(-1)).toBe(clockSeconds('10:00'));
    expect(availableTimes(dateTimeTimeRules('2026-09-06', rules))).toEqual([]);
    expect(dateTimeError('2026-09-07 12:00', rules)).not.toBe('');
    expect(dateTimeError('2026-09-08 00:00', rules)).toBe('');
  });
  it('applies date/business restrictions without fabricating a date for time-first drafts', () => {
    const calls: string[] = [];
    const rules = { granularity: 'minute' as const, minuteStep: 15, isDateUnavailable: (date: string) => date === '2026-09-08', isDateTimeUnavailable: (value: string) => { calls.push(value); return value === '2026-09-07 09:00'; } };
    expect(availableTimes(dateTimeTimeRules(null, rules))).toHaveLength(96);
    expect(calls).toEqual([]);
    expect(availableTimes(dateTimeTimeRules('2026-09-08', rules))).toEqual([]);
    expect(dateTimeError('2026-09-08 09:00', rules)).toContain('日期不可选');
    expect(dateTimeError('2026-09-07 09:00', rules)).toContain('日期时间不可用');
    expect(dateTimeError('2026-09-07 09:05', rules)).toContain('步长');
    expect(availableTimes(dateTimeTimeRules('2026-09-07', rules))).not.toContain(clockSeconds('09:00'));
    expect(calls.every(value => value.startsWith('2026-09-07 '))).toBe(true);
  });
  it('rejects reversed host boundaries and invalid steps even for empty fields', () => {
    expect(() => dateTimeError(null, { min: '2026-09-09 00:00', max: '2026-09-07 00:00' })).toThrow();
    expect(() => dateTimeTimeRules(null, { min: 'invalid' })).toThrow();
    expect(() => dateTimeError(null, { secondStep: 0 })).toThrow();
  });
});
