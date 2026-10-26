import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { it, expect } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { separatorRecipeCatalog, separatorShortcuts } from './separator';

it('ships all static boundary recipes with logical edges and shared semantic geometry', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: separatorShortcuts, safelist: [...separatorRecipeCatalog] });
  const { css, matched } = await generator.generate('');
  for (const name of separatorRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const name of ['--qk-border-width-default', '--qk-color-border-subtle', '--qk-space-inline', '--qk-space-surface-compact']) expect(css).toContain(`var(${name})`);
  expect(css).toContain('border-inline-start:');
  expect(css).toContain('border-block-start:');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).not.toMatch(/animation:|box-shadow:|overflow:hidden/);
});

it('keeps inline vertical boundaries at one em without a competing line minimum', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: separatorShortcuts });
  const { css } = await generator.generate('qk-separator qk-separator--vertical qk-separator--inline qk-separator__line', { preflights: false });
  const vertical = declarationsFor(css, 'qk-separator--vertical');
  const inline = declarationsFor(css, 'qk-separator--inline');
  expect(inline).toContain('block-size:1em');
  expect(inline).toContain('--qk-separator-inline-min-block:0');
  expect(vertical).toMatch(/--qk-separator-min-block:var\(--qk-separator-inline-min-block,\s*var\(--qk-space-surface-compact\)\)/u);
  expect(vertical).toContain('align-self:var(--qk-separator-align, center)');
  expect(inline).not.toContain('--qk-separator-min-block:');
  expect(css).toContain('min-block-size:var(--qk-separator-min-block)');
});

it('leaves labeled height intrinsic and makes explicit stretch independent of rule order', async () => {
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: separatorShortcuts });
  const { css } = await generator.generate('qk-separator qk-separator--vertical qk-separator--stretch qk-separator__line qk-separator__label', { preflights: false });
  const vertical = declarationsFor(css, 'qk-separator--vertical');
  const stretch = declarationsFor(css, 'qk-separator--stretch');
  expect(vertical).toContain('align-self:var(--qk-separator-align, center)');
  expect(stretch).toContain('--qk-separator-align:stretch');
  expect(stretch).not.toContain('align-self:');
  expect(css).not.toContain('--qk-separator-inline-min-block:0');
  expect(css).not.toMatch(/(?:^|[;{])block-size:/u);
  expect(css).toContain('overflow-wrap:anywhere');
});

/**
 * Reads the generated declarations for one standalone recipe selector.
 * @param css Generated UnoCSS output.
 * @param name Static recipe class whose declarations are required.
 * @returns The declarations emitted for that recipe.
 */
function declarationsFor(css: string, name: string): string {
  const rule = css.match(new RegExp(`\\.${name}\\{([^}]+)\\}`, 'u'));
  expect(rule, `Generated recipe ${name}`).not.toBeNull();
  return rule?.[1] ?? '';
}
