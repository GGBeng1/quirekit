import { describe, expect, it } from 'vitest';
import { transferItems, transferMove, transferFilter, transferToggleAll } from './model';

const items = [
  { value: 'a', label: '林溪', description: '产品设计' },
  { value: 'b', label: '周宁', description: 'Engineering' },
  { value: 'c', label: '陈知', disabled: true },
  { value: 'd', label: '许言', description: '产品运营' }
];

describe('Transfer membership and visible selection', () => {
  it('keeps source order, target model order and unknown target identities', () => {
    expect(transferItems(items, ['d', 'missing', 'b', 'b'], 'source').map(item => item.value)).toEqual(['a', 'c']);
    expect(transferItems(items, ['d', 'missing', 'b', 'b'], 'target').map(item => item.value)).toEqual(['d', 'b']);
    expect(transferMove(items, ['missing', 'd'], ['b', 'a', 'c'], 'target')).toEqual({ value: ['missing', 'd', 'a', 'b'], keys: ['a', 'b'] });
  });

  it('removes only known enabled requested members and preserves locked or absent ones', () => {
    expect(transferMove(items, ['c', 'missing', 'b', 'd'], ['b', 'c', 'missing'], 'source')).toEqual({ value: ['c', 'missing', 'd'], keys: ['b'] });
    expect(transferMove(items, ['b'], ['b', 'gone'], 'target')).toEqual({ value: ['b'], keys: [] });
  });

  it('filters labels and descriptions and limits bulk selection to enabled results', () => {
    expect(transferFilter(items, ' engineering ').map(item => item.value)).toEqual(['b']);
    const visible = transferFilter(items, '产品');
    expect(transferToggleAll(visible, ['a', 'b'])).toEqual(['a', 'b', 'd']);
    expect(transferToggleAll(visible, ['a', 'b', 'd'])).toEqual(['b']);
    expect(transferToggleAll(items, [])).toEqual(['a', 'b', 'd']);
  });

  it('rejects ambiguous item keys before rendering either column', () => {
    expect(() => transferItems([...items, items[0]!], [], 'source')).toThrow(/unique/);
    expect(() => transferItems([{ value: ' ', label: '空标识' }], [], 'source')).toThrow(/non-empty/);
  });
});
