import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { generateQuireKitCss } from '../../output/css';
import { hierarchyPickerRecipeCatalog } from './hierarchy-picker';

it('ships bounded popup geometry and check states in both stylesheet modes', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate(hierarchyPickerRecipeCatalog.join(' '));
  for (const name of hierarchyPickerRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const output of [css, await generateQuireKitCss()]) {
    expect(output).toContain('--available-height');
    expect(output).toContain('.qk-tree-view__checkbox[data-state=indeterminate]');
    expect(output).toContain('.qk-popover__content.qk-hierarchy-picker__popup--flyouts');
    expect(output).toContain('width: min(12rem, calc(100vw - 16px))');
  }
});
