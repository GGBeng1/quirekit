import { expect, test } from '@playwright/test';
import { parseMathLatex, renderMathML } from '../src/index';

test('native MathML retains nested geometry, theme and safe author text', async ({ page }) => {
  const parsed = parseMathLatex(String.raw`\frac{x_1}{\sqrt[3]{y^2}}`);
  if (!parsed.ok) throw new Error(parsed.diagnostic.message);
  await page.setContent(`<style>math {font-size:32px;color:rgb(20, 60, 100)}</style>${renderMathML(parsed.document)}`);
  const formula = page.locator('math');
  await expect(formula).toHaveCSS('color', 'rgb(20, 60, 100)');
  const numerator = await page.locator('mfrac > mrow').first().boundingBox();
  const denominator = await page.locator('mfrac > mrow').last().boundingBox();
  expect(numerator).not.toBeNull();
  expect(denominator).not.toBeNull();
  expect(numerator!.y + numerator!.height).toBeLessThan(denominator!.y);
  const base = await page.locator('msup > mi').boundingBox();
  const script = await page.locator('msup mn').boundingBox();
  expect(script!.height).toBeLessThan(base!.height);
  expect(script!.y).toBeLessThan(base!.y);
  await formula.screenshot({ path: '.playwright-results/math/native-mathml.png' });
  const hostile = parseMathLatex('<img>');
  if (!hostile.ok) throw new Error(hostile.diagnostic.message);
  await page.setContent(renderMathML(hostile.document));
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.locator('math')).toHaveText('<img>');
});
