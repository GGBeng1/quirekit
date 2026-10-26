import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { expect, it } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { anchorRecipeCatalog, anchorShortcuts } from './anchor';

it('retains logical indentation, current-location color and keyboard focus without owning page positioning', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: anchorShortcuts, safelist: [...anchorRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of anchorRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('border-inline-start');
  expect(css).toContain('--qk-color-text-accent');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).not.toMatch(/position:sticky|position:fixed|text-overflow:ellipsis/);
});
