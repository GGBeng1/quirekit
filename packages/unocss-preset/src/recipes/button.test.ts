import { createGenerator } from '@unocss/core';
import { expect, it } from 'vitest';
import { defineQuireKitUnoConfig } from '../preset/config';

it('applies the shared Button radius contract to every IconButton size', async () => {
  const generator = await createGenerator(defineQuireKitUnoConfig());
  const { css } = await generator.generate('');
  for (const size of ['xs', 'sm', 'md', 'lg', 'xl']) {
    const rule = css.match(new RegExp(`\\.qk-icon-button--${size}\\{([^}]*)\\}`))?.[1];
    expect(rule).toContain(`border-radius:var(--qk-button-${size}-radius)`);
  }
  expect(css).toMatch(/\.qk-icon-button--circle\.qk-icon-button\{[^}]*border-radius:var\(--qk-radius-pill\)/);
});
