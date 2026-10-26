import { describe, expect, it } from 'vitest';
import { activeAnchor, decodeAnchorHash, normalizeAnchorOffset } from './position';

describe('anchor position', () => {
  const targets = [{ id: 'overview', top: -80 }, { id: 'detail', top: 16 }, { id: 'end', top: 600 }];
  it('selects the last heading crossing the same offset used for navigation', () => {
    expect(activeAnchor(targets, 16, false)).toBe('detail');
    expect(activeAnchor(targets, 0, false)).toBe('overview');
    expect(activeAnchor(targets.slice(2), 16, false)).toBe('end');
    expect(activeAnchor([], 16, true)).toBe('');
  });
  it('allows the final short section to become current at the end of a scrollable viewport', () => {
    expect(activeAnchor(targets, 16, true)).toBe('end');
  });
  it('uses geometric order even when hidden or rearranged headings change layout', () => {
    expect(activeAnchor([...targets].reverse(), 16, false)).toBe('detail');
    expect(activeAnchor([...targets].reverse(), 16, true)).toBe('end');
  });
  it('decodes Unicode and literal percent IDs without treating malformed URLs as exceptions', () => {
    expect(decodeAnchorHash('#%E7%AB%A0%E8%8A%82')).toBe('章节');
    expect(decodeAnchorHash('#100%25')).toBe('100%');
    expect(decodeAnchorHash('#100%')).toBe('100%');
    expect(decodeAnchorHash('')).toBe('');
  });
  it('rejects non-finite or negative offsets', () => {
    expect(normalizeAnchorOffset(Number.NaN)).toBe(16);
    expect(normalizeAnchorOffset(-3)).toBe(0);
    expect(normalizeAnchorOffset(24)).toBe(24);
  });
});
