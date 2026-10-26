import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { it, expect } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { navigationMenuRecipeCatalog, navigationMenuShortcuts } from './navigation-menu';

it('publishes native navigation geometry, visible focus and viewport-bounded overflow', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: navigationMenuShortcuts, safelist: [...navigationMenuRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of navigationMenuRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const name of ['--qk-control-compact', '--qk-space-inline', '--qk-space-inline-tight']) expect(css).toContain(`var(${name})`);
  expect(css).toContain(':focus-visible'); expect(css).toContain('padding-inline-start');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).toContain('--qk-navigation-current-foreground:var(--qk-color-action-text)');
  expect(css).toContain('transition:transform var(--qk-motion-control-duration)');
  expect(css).toContain('prefers-reduced-motion: reduce');
  expect(css).not.toMatch(/animation:|text-overflow:ellipsis/);
});
