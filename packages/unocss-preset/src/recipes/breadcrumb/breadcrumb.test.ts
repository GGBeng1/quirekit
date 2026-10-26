import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { it, expect } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { breadcrumbRecipeCatalog, breadcrumbShortcuts } from './breadcrumb';

it('publishes native navigation geometry, visible focus and viewport-bounded overflow', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: breadcrumbShortcuts, safelist: [...breadcrumbRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of breadcrumbRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const name of ['--qk-control-compact', '--qk-space-inline', '--qk-space-surface']) expect(css).toContain(`var(${name})`);
  expect(css).toContain(':focus-visible'); expect(css).toContain(':dir(rtl)');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).not.toMatch(/transition:|animation:|text-overflow:ellipsis/);
});
