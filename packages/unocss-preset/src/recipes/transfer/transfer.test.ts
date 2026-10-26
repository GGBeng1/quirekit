import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { generateQuireKitCss } from '../../output/css';
import { transferRecipeCatalog } from './transfer';

it('publishes the complete two-list composition and narrow-container behavior', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate(transferRecipeCatalog.join(' '));
  for (const name of transferRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const output of [css, await generateQuireKitCss()]) {
    expect(output).toContain('@container qk-transfer');
    expect(output).toContain('grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)');
    expect(output).toContain('.qk-transfer__panel');
    expect(output).toContain('--qk-color-border-default');
  }
});
