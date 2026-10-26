import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { chatRecipeCatalog } from './chat';

it('publishes all Chat recipes through the actual preset with one anchoring owner', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate('');
  for (const name of chatRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain('overflow-anchor:none');
  expect(css).toContain('inset-inline-end:');
  expect(css).toContain('var(--qk-color-surface-subtle)');
  expect(css).toContain('margin-inline-start:auto');
  expect(css).toContain('var(--qk-chat-content-width,48rem)');
  expect(css).toContain('font-weight:var(--qk-type-control-font-weight)');
  expect(css).toContain('border-radius:var(--qk-radius-group)');
  expect(css).toContain('.qk-chat-composer__surface:focus-within');
  expect(css).toContain('border-radius:var(--qk-radius-dialog)');
  expect(css).toContain('.qk-chat-composer[data-layout="inline"]');
  expect(css).toContain('box-shadow: var(--qk-elevation-raised)');
  expect(css).toContain('--qk-button-neutral-foreground:var(--qk-color-text-muted)');
  expect(css).toContain('--qk-button-xs-icon-size:14px');
  expect(css).toContain('align-self: center; padding-block-start: 0;');
  expect(css).toContain('.qk-chat-process > .qk-collapsible > .qk-collapsible__trigger--plain');
  expect(css).toContain('padding-inline: 0 !important;');
});
