import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

/**
 * Checks the original mathematical text carried by path-only SVG groups.
 * @param locator - One mathematical group or an ordered family of groups.
 * @param expected - Matching MathML token text, independent of SVG ink markup.
 * @returns Resolves once asynchronous graphic presentation matches the accepted edit.
 */
export async function expectMathText(locator: Locator, expected: string | readonly string[]): Promise<void> {
  if (typeof expected === 'string') await expect(locator).toHaveAttribute('data-math-text', expected);
  else {
    await expect(locator).toHaveCount(expected.length);
    await expect.poll(() => locator.evaluateAll(elements => elements.map(element => element.getAttribute('data-math-text')))).toEqual(expected);
  }
}

/**
 * Waits for all visible resident previews before measuring their actual graphics.
 * @param gallery - Visible choice group or matrix preview.
 * @returns Resolves after every mounted SVG preview matches its source snapshot.
 */
export async function expectPreviewsReady(gallery: Locator): Promise<void> {
  await expect(gallery.locator('.qk-math-svg')).not.toHaveCount(0);
  await expect.poll(() => gallery.locator('.qk-math-svg').evaluateAll(elements => elements.filter(element => element.getAttribute('data-ready') !== 'true').length)).toBe(0);
}
