import { describe, expect, it } from 'vitest';
import { containsCurrent, normalizeExpansion } from './projection';
import type { QuireKitNavigationMenuItem } from './types';
const items: QuireKitNavigationMenuItem[] = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'docs', label: 'Docs', children: [{ key: 'nested', label: 'Nested', children: [{ key: 'current', label: 'Current', href: '/current' }] }] },
  { key: 'empty', label: 'Empty', children: [] },
  { key: 'locked', label: 'Locked', disabled: true, children: [{ key: 'locked-child', label: 'Locked child', children: [{ key: 'private', label: 'Private', href: '/private' }] }] }
];
describe('navigation expansion projection', () => {
  it('distinguishes current leaf ancestry from expansion identities', () => {
    expect(containsCurrent(items[1]!, 'current')).toBe(true);
    expect(containsCurrent(items[1]!, 'docs')).toBe(false);
    expect(containsCurrent(items[0]!, 'current')).toBe(false);
  });
  it('filters deleted, leaf, empty, duplicate and inherited disabled groups', () => {
    const input = ['deleted', 'home', 'docs', 'nested', 'docs', 'locked', 'locked-child', 'empty'];
    expect(normalizeExpansion(items, input, true)).toEqual(['docs', 'nested']);
    expect(normalizeExpansion(items, input, false)).toEqual(['docs']);
    expect(normalizeExpansion(items, input, true, true)).toEqual([]);
    expect(normalizeExpansion([], input, true)).toEqual([]);
  });
});
