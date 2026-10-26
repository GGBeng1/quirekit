import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { commentRecipeCatalog } from './comment';

it('publishes the comment anatomy and its state rules through the actual preset', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate('');
  for (const name of commentRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('.qk-comment-thread[data-active]');
  expect(css).toContain('.qk-comment-thread__quote::before');
  expect(css).toContain('-webkit-line-clamp: 2');
  expect(css).toContain('.qk-card.qk-comment-thread--plain { box-shadow: none;');
  expect(css).toContain('.qk-comment-thread__header:has(.qk-comment-thread__stepper) .qk-comment-thread__actions { position: static;');
  // Unmeasured cards stay focusable so an opening draft receives the caret.
  expect(css).toContain('.qk-comment-rail__item:not([data-measured]) { opacity: 0; }');
  expect(css).not.toContain('.qk-comment-rail__item:not([data-measured]) { visibility: hidden; }');
});
