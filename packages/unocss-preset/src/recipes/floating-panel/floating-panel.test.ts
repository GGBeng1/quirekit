import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { expect, it } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { floatingPanelRecipeCatalog, floatingPanelShortcuts } from './floating-panel';

it('publishes every floating panel recipe as a raised, draggable overlay card', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: floatingPanelShortcuts, safelist: [...floatingPanelRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of floatingPanelRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const variable of ['--qk-color-surface-raised', '--qk-elevation-overlay', '--qk-radius-overlay', '--qk-layer-overlay']) expect(css).toContain(`var(${variable}`);
  expect(css).toContain('cursor:move');
});
