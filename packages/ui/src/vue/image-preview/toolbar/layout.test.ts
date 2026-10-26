import { expect, it } from 'vitest';
import { quireImagePreviewToolbarPresets, resolveToolbarLayout } from './layout';
it('resolves presets, legacy switches and explicit empty overrides', () => {
  expect(resolveToolbarLayout(true, true)).toEqual(quireImagePreviewToolbarPresets.standard);
  expect(resolveToolbarLayout('compact')).toEqual(['zoomOut', 'scale', 'zoomIn']);
  expect(resolveToolbarLayout(false, true)).toEqual([]);
  expect(resolveToolbarLayout({ preset: 'gallery', layout: [] })).toEqual([]);
  expect(Object.isFrozen(quireImagePreviewToolbarPresets.standard)).toBe(true);
});
it('preserves custom positions and cleans duplicates and empty separators', () => {
  const config = { layout: ['separator', 'fit', 'fit', 'separator', 'separator', { slot: 'save' }, 'actions', 'separator'] } as const;
  expect(resolveToolbarLayout(config, true, true)).toEqual(['fit', 'separator', { slot: 'save' }, 'actions']);
  expect(resolveToolbarLayout(config)).toEqual(['fit']);
});
