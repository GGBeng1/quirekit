import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../preset/config';
import { sourceRecipeCatalog } from './sources';

it('publishes generic source and citation anatomy outside the Chat recipe', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate('');
  for (const name of sourceRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('.qk-sources > .qk-collapsible');
  expect(css).toContain('.qk-inline-citation__card .qk-button');
});
