import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { it, expect } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { cardRecipeCatalog, cardShortcuts } from './card';

it('publishes every Card recipe with semantic spacing and no implicit elevation or clipping', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: cardShortcuts, safelist: [...cardRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of cardRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const variable of ['--qk-space-surface', '--qk-space-surface-compact', '--qk-space-inline-tight', '--qk-color-border-subtle', '--qk-type-heading-font-weight']) expect(css).toContain(`var(${variable})`);
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).not.toMatch(/box-shadow:|overflow:hidden|animation:/);
});
