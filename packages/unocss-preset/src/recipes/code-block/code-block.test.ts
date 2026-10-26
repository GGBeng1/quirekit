import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';

it('ships source scrolling, focus, theme tokens and prose scope boundaries in generated CSS', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate('qk-code-block qk-code-block__viewport qk-code-block__viewport--wrap qk-prose');
  expect(matched.has('qk-code-block__viewport')).toBe(true);
  expect(css).toContain('overflow:auto');
  expect(css).toContain('font-family:var(--qk-type-code-font-family)');
  expect(css).toContain('white-space:pre-wrap');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('--shiki-dark');
  expect(css).toContain('@scope (.qk-prose, .qk-prose-node) to ([data-qk-not-prose], [data-qk-not-typography])');
  expect(css).toContain('.qk-code-block__viewport[hidden]');
});
