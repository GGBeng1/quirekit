import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { expect, it } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { resultRecipeCatalog, resultShortcuts } from './result';

it('publishes every result variant with resolved semantic typography and long-content containment', async () => {
  const generator = await createGenerator<Theme>({
    presets: [presetWind3()], theme: quireKitUnoTheme,
    shortcuts: resultShortcuts, safelist: [...resultRecipeCatalog],
  });
  const { css, matched } = await generator.generate('');
  for (const part of resultRecipeCatalog) expect(matched.has(part)).toBe(true);
  expect(css).toContain('var(--qk-type-section-title-font-size)');
  expect(css).toContain('var(--qk-type-heading-font-size)');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).toContain('flex-wrap:wrap');
  expect(css).toContain('var(--qk-color-danger-solid)');
  expect(css).toContain('var(--qk-color-icon-secondary)');
  expect(css).not.toContain('var(--qk-color-danger-text)');
});
