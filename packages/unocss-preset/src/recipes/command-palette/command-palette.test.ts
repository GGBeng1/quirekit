import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { it, expect } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { commandPaletteRecipeCatalog, commandPaletteShortcuts } from './command-palette';
it('keeps shared control geometry, bounded scrolling and untruncated command labels', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: commandPaletteShortcuts, safelist: [...commandPaletteRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of commandPaletteRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('var(--qk-control-default)');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).toContain('overflow:auto');
  expect(css).not.toMatch(/transition:|animation:|text-overflow:ellipsis/);
});
