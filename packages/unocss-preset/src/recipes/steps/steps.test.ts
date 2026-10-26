import { createGenerator } from '@unocss/core';
import { presetWind3, type Theme } from '@unocss/preset-wind3';
import { it, expect } from 'vitest';
import { quireKitUnoTheme } from '../../theme/bridge';
import { stepsRecipeCatalog, stepsShortcuts } from './steps';
it('uses shared indicator sizes, readable state colors and scrolling without animation', async()=>{
  const generator=await createGenerator<Theme>({presets:[presetWind3()],theme:quireKitUnoTheme,shortcuts:stepsShortcuts,safelist:[...stepsRecipeCatalog]});
  const {css,matched}=await generator.generate('');
  for(const name of stepsRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('var(--qk-control-compact)');
  expect(css).toContain('var(--qk-color-action-primary)');
  expect(css).toContain('overflow-wrap:anywhere');
  expect(css).toContain('overflow-x:auto');
  expect(css).not.toMatch(/transition:|animation:|text-overflow:ellipsis/);
});
