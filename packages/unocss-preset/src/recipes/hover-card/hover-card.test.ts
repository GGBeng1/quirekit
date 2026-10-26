import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';

it('bounds the preview to available space and shares modal surface layering', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css } = await generator.generate('');
  expect(css).toContain('.qk-hover-card__content');
  expect(css).toContain('width:var(--qk-hover-card-width,20rem)');
  expect(css).toContain('max-width:min(calc(100vw - 16px),var(--available-width,100vw))');
  expect(css).toContain('max-height:min(calc(100dvh - 16px),var(--available-height,100dvh))');
  expect(css).toContain('.qk-hover-card__positioner--modal');
  expect(css).toContain('--qk-popover-layer:calc(var(--qk-layer-modal) + 1)');
});
