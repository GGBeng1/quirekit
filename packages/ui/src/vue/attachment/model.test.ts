import { expect, it } from 'vitest';
import { attachmentActions, attachmentMeta, attachmentProgress } from './model';

it('only exposes host-authorized intents in executable states, without mutating the item', () => {
  const actions = ['open', 'download', 'retry', 'remove', 'remove'] as const;
  expect(attachmentActions({ id: 'a', name: 'a', actions })).toEqual(['open', 'download', 'remove']);
  expect(attachmentActions({ id: 'a', name: 'a', actions, state: 'uploading' })).toEqual(['remove']);
  for (const state of ['failed', 'unavailable'] as const) {
    expect(attachmentActions({ id: 'a', name: 'a', actions, state })).toEqual(['retry', 'remove']);
  }
  expect(attachmentActions({ id: 'a', name: 'a' })).toEqual([]);
  expect(actions).toHaveLength(5);
});

it('does not invent file sizes or upload progress, and clamps only presentation values', () => {
  expect(attachmentProgress(undefined)).toBeNull();
  expect(attachmentProgress(NaN)).toBeNull();
  expect(attachmentProgress(Infinity)).toBeNull();
  expect(attachmentProgress(-3)).toBe(0);
  expect(attachmentProgress(140)).toBe(100);
  expect(attachmentMeta({ id: 'a', name: 'plan.pdf', size: 2048 })).toBe('PDF · 2 KB');
  expect(attachmentMeta({ id: 'a', name: 'file', size: -2 })).toBe('');
  expect(attachmentMeta({ id: 'a', name: 'file', size: 0 })).toBe('0 B');
});
