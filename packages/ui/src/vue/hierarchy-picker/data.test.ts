import { expect, it } from 'vitest';
import { hierarchyEntries, prepareHierarchy, protectSelection, searchHierarchy } from './data';

it('searches full paths without losing duplicate leaf labels or enabling a disabled subtree', () => {
  const nodes = Object.freeze([{ id: 'a', label: '甲', children: [{ id: 'x', label: '文档' }] },
    { id: 'b', label: '乙', disabled: true, children: [{ id: 'y', label: '文档' }] }]);
  const entries = hierarchyEntries(prepareHierarchy(nodes));
  expect(searchHierarchy(entries, '文档').map(entry => entry.node.id)).toEqual(['x', 'y']);
  expect(searchHierarchy(entries, '乙 文档')[0]?.text).toBe('乙 / 文档');
  expect(entries.find(entry => entry.node.id === 'y')?.node.disabled).toBe(true);
  expect(nodes[1]?.children[0]).not.toHaveProperty('disabled');
  expect(protectSelection(['x', 'y', 'unknown'], ['missing'], entries)).toEqual(['x', 'missing']);
  expect(protectSelection([], ['y'], entries)).toEqual(['y']);
});

it('rejects duplicate or empty identities before rendering ambiguous tree items', () => {
  expect(() => hierarchyEntries([{ id: 'same', label: 'A', children: [{ id: 'same', label: 'B' }] }])).toThrow('globally unique');
  expect(() => hierarchyEntries([{ id: '', label: 'Empty' }])).toThrow('nonempty');
});
