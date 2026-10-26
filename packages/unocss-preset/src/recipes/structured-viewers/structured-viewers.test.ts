import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';

it('ships both viewers with semantic surfaces, bounded focus and change colors', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css } = await generator.generate('qk-code-block qk-segmented qk-clipboard', { preflights: true });
  expect(css).toContain('.qk-json-viewer__tree');
  expect(css).toContain('.qk-diff-viewer__line[data-kind="added"]');
  expect(css).toContain('var(--qk-color-success-surface)');
  expect(css).toContain('var(--qk-color-danger-surface)');
  expect(css).toContain('var(--qk-color-border-subtle)');
  expect(css).toContain('.qk-json-viewer__summary:focus-visible');
});
