import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';

it('publishes bounded confirmation surfaces and semantic errors in standalone CSS', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css } = await generator.generate('');
  expect(css).toContain('.qk-popconfirm{');
  expect(css).toContain('max-width:min(calc(100vw - 16px),var(--available-width,100vw))');
  expect(css).toContain('.qk-popconfirm__actions');
  expect(css).toContain('.qk-popconfirm__error');
  expect(css).toContain('var(--qk-color-danger-foreground)');
});
