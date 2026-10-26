import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { attachmentRecipeCatalog } from './attachment';

it('ships all attachment anatomy, intrinsic layouts and quiet accessible actions in the real preset', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate('');
  for (const name of attachmentRecipeCatalog) expect(matched.has(name), name).toBe(true);
  for (const value of ['repeat(auto-fill,minmax(min(100%,10rem),1fr))', 'grid-template-areas:', 'var(--qk-color-text-muted)', 'min-width: 44px', ':focus-visible']) {
    expect(css.includes(value), value).toBe(true);
  }
  expect(css).toContain('grid-template-areas: "preview content actions";');
  expect(css).toContain('(hover: hover) and (pointer: fine)');
  expect(css).toContain('pointer-events: none');
  expect(css).toContain('height: 64px; padding: 8px;');
  expect(css).toContain('.qk-horizontal-strip__viewport');
  expect(css).toContain('--qk-file-icon-document');
  expect(css).toContain('--qk-file-icon-spreadsheet');
  expect(css).toContain('forced-colors: active');
});
