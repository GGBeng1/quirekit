import { describe, expect, it, vi } from 'vitest';
import { copyDateTimeRange, dateTimeRangeEndpointRules, dateTimeRangeError } from './value';

describe('civil date-time ranges', () => {
  it('preserves independent empty endpoints and canonical precision without mutating the host', () => {
    const value = { start: null, end: '2026-09-08 09:05' };
    expect(copyDateTimeRange(value)).toEqual({ start: null, end: '2026-09-08 09:05:00' });
    expect(copyDateTimeRange(value, 'minute')).toEqual(value);
    expect(copyDateTimeRange(value)).not.toBe(value);
    expect(value.end).toBe('2026-09-08 09:05');
    expect(dateTimeRangeError(value, {})).toBe('');
  });
  it('compares whole dates across leap days, years and midnight, without silently reversing', () => {
    for (const value of [
      { start: '2024-02-29 23:59:59', end: '2024-03-01 00:00:00' },
      { start: '2026-12-31 23:59:59', end: '2027-01-01 00:00:00' },
      { start: '2026-09-07 09:00:00', end: '2026-09-07 09:00:00' }
    ]) expect(dateTimeRangeError(value, {})).toBe('');
    const reversed = { start: '2026-09-07 23:00:00', end: '2026-09-07 01:00:00' };
    expect(dateTimeRangeError(reversed, {})).toContain('不能早于');
    expect(copyDateTimeRange(reversed)).toEqual(reversed);
  });
  it('rejects malformed, timezone-bearing and lossy values or invalid host limits', () => {
    for (const end of ['2026-02-29 09:00:00', '2026-09-07T09:00:00Z', '2026-09-07 09:00:00.001']) {
      expect(() => copyDateTimeRange({ start: null, end })).toThrow();
    }
    expect(() => copyDateTimeRange({ start: null, end: '2026-09-07 09:00:01' }, 'minute')).toThrow();
    expect(() => dateTimeRangeError({ start: null, end: null }, { min: '2026-09-08 09:00:00', max: '2026-09-07 09:00:00' })).toThrow();
  });
  it('applies endpoint constraints independently with contextual recovery messages', () => {
    const rules = { min: '2026-09-07 12:00:00', max: '2026-09-09 10:00:00', minuteStep: 15 };
    expect(dateTimeRangeError({ start: '2026-09-07 11:00:00', end: null }, rules)).toContain('开始时间');
    expect(dateTimeRangeError({ start: null, end: '2026-09-09 10:15:00' }, rules)).toContain('结束时间');
    expect(dateTimeRangeError({ start: '2026-09-08 00:00:00', end: '2026-09-08 23:45:00' }, rules)).toBe('');
    expect(dateTimeRangeError({ start: null, end: '2026-09-08 13:07:00' }, rules)).not.toBe('');
    const unavailable = vi.fn((_date: string, endpoint: 'start' | 'end') => endpoint === 'end');
    const projected = dateTimeRangeEndpointRules({ isDateUnavailable: unavailable }, 'end');
    expect(projected.isDateUnavailable?.('2026-09-08')).toBe(true);
    expect(unavailable).toHaveBeenCalledWith('2026-09-08', 'end');
    const time = vi.fn(() => true);
    expect(dateTimeRangeError({ start: null, end: '2026-09-08 13:00:00' }, { isDateTimeUnavailable: time })).toContain('结束时间');
    expect(time).toHaveBeenCalledWith('2026-09-08 13:00:00', 'end');
  });
  it('runs whole-range rules only after complete valid ordered endpoints', () => {
    const isRangeUnavailable = vi.fn(() => true);
    const rules = { isRangeUnavailable, granularity: 'minute' as const };
    for (const value of [
      { start: null, end: '2026-09-07 10:00' },
      { start: '2026-09-07 11:00', end: '2026-09-07 10:00' }
    ]) dateTimeRangeError(value, rules);
    dateTimeRangeError({ start: '2026-09-07 09:07', end: '2026-09-07 10:00' }, { ...rules, minuteStep: 15 });
    expect(isRangeUnavailable).not.toHaveBeenCalled();
    expect(dateTimeRangeError({ start: '2026-09-07 09:00', end: '2026-09-07 10:00' }, rules)).toContain('范围不可用');
    expect(isRangeUnavailable).toHaveBeenCalledExactlyOnceWith({ start: '2026-09-07 09:00', end: '2026-09-07 10:00' });
  });
  it('checks endpoints, never enumerating every instant within a long range', () => {
    const isDateUnavailable = vi.fn(() => false), isDateTimeUnavailable = vi.fn(() => false);
    const isRangeUnavailable = vi.fn(() => false);
    expect(dateTimeRangeError({ start: '0001-01-01 00:00:00', end: '9999-12-31 23:59:59' }, { isDateUnavailable, isDateTimeUnavailable, isRangeUnavailable })).toBe('');
    expect(isDateUnavailable).toHaveBeenCalledTimes(2);
    expect(isDateTimeUnavailable).toHaveBeenCalledTimes(2);
    expect(isRangeUnavailable).toHaveBeenCalledTimes(1);
  });
});
