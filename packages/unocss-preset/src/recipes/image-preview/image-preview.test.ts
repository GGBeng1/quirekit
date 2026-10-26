import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
it('publishes modal bounds, captured gestures and accessible mobile targets', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig()); const { css } = await generator.generate('');
  expect(css).toContain('.qk-image-preview{'); expect(css).toContain('height:100dvh');
  expect(css).toContain('touch-action:none');
  expect(css).toContain('calc(var(--qk-layer-modal) + 2)');
  expect(css).toContain('width:max(100%,44px)');
  expect(css).toContain('background:var(--qk-preview-mask-color)');
  expect(css).toContain('.qk-image-preview__thumbnail[aria-current=true]');
});
