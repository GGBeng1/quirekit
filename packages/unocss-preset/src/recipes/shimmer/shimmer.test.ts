import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { shimmerRecipeCatalog } from './shimmer';

it('publishes readable themed text, animation and preference fallbacks through the real preset', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate('');
  for (const name of shimmerRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('@keyframes qk-shimmer-sweep');
  expect(css).toContain('var(--qk-color-text-secondary)');
  expect(css).toContain('var(--qk-color-text-muted) 34%');
  expect(css).toContain('var(--qk-color-text-primary) 44%');
  expect(css).toContain('var(--qk-color-text-primary) 56%');
  expect(css).toContain('var(--qk-color-text-primary)');
  expect(css).toContain('background-size: 300% 100%');
  expect(css).toContain('background-repeat: no-repeat');
  expect(css).toContain('to { background-position: 0% 0; }');
  expect(css).toContain('var(--qk-motion-overlay-duration) * 8');
  expect(css).toContain('@supports ((background-clip: text)');
  expect(css).toContain('(prefers-reduced-motion: reduce), (forced-colors: active), print');
  expect(css).toContain(':dir(rtl)');
  expect(css).toContain('CanvasText');
});
