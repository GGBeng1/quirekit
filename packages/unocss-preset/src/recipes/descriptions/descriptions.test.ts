import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../../preset/config';
import { generateQuireKitCss } from '../../output/css';
import { descriptionsRecipeCatalog } from './descriptions';

it('ships container layouts and every anatomy class in preset and standalone CSS', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css, matched } = await generator.generate(descriptionsRecipeCatalog.join(' '));
  for (const name of descriptionsRecipeCatalog) expect(matched.has(name)).toBe(true);
  for (const output of [css, await generateQuireKitCss()]) {
    expect(output).toContain('@container qk-descriptions');
    expect(output).toContain('overflow-wrap: anywhere');
    expect(output).toContain('--qk-descriptions-span-4: 3');
    expect(output).toContain('--qk-color-border-subtle');
  }
});
