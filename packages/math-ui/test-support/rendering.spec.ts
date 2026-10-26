import { expect, test } from '@playwright/test';
import { expectMathText, expectPreviewsReady } from './layout';

test('font fallback retains the last graphic, suspends obsolete geometry and recovers', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  const source = panel.getByLabel('LaTeX 源码', { exact: true });
  const surface = panel.locator('.qk-math-input');
  await source.fill('x'); await expect(surface).toHaveAttribute('data-ready', 'true');
  const graphic = await surface.locator('svg').evaluate(element => element.outerHTML);
  await source.fill('😀');
  await expect(surface).toContainText('此公式暂时无法显示，请调整内容后重试');
  expect(await surface.locator('svg').evaluate(element => element.outerHTML)).toBe(graphic);
  await expect(panel.getByRole('button', { name: '确定', exact: true })).toBeDisabled();
  await expect(surface.locator('.qk-math-overlay__slot, .qk-math-input__caret')).toHaveCount(0);
  // Keyboard acceptance remains available while invalid graphics cannot be hit.
  const input = panel.getByLabel('可视化公式输入');
  await input.focus(); await input.press('ControlOrMeta+a'); await input.pressSequentially('y');
  await expect(surface).toHaveAttribute('data-ready', 'true');
  await expectMathText(surface.locator('[data-mml-node="math"]'), 'y');
  await expect(panel.getByRole('button', { name: '确定', exact: true })).toBeEnabled();
});

test('delayed local fonts coalesce presentation while accepting every edit', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/*hebrew*', async route => { requested = true; await held; await route.continue(); });
  await page.goto('/');
  const panel = page.getByRole('region', { name: '公式编辑' });
  await panel.getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  const source = panel.getByLabel('LaTeX 源码', { exact: true });
  const surface = panel.locator('.qk-math-input');
  await source.fill('x'); await expect(surface).toHaveAttribute('data-ready', 'true');
  const layouts = Number(await surface.getAttribute('data-layouts'));
  await source.fill('א'); await expect.poll(() => requested).toBe(true);
  await expect(surface).toHaveAttribute('data-ready', 'false');
  await expect(panel.getByRole('button', { name: '确定', exact: true })).toBeDisabled();
  const input = panel.getByLabel('可视化公式输入');
  await input.focus(); await input.press('End'); await input.pressSequentially('abc');
  await expect(source).toHaveValue('אabc');
  await expectMathText(surface.locator('[data-mml-node="math"]'), 'x');
  await expect(surface.locator('.qk-math-overlay__slot, .qk-math-input__caret')).toHaveCount(0);
  release(); await expect(surface).toHaveAttribute('data-ready', 'true');
  await expectMathText(surface.locator('[data-mml-node="math"]'), 'אabc');
  expect(Number(await surface.getAttribute('data-layouts')) - layouts).toBe(2);
  const before = await surface.getAttribute('data-layouts');
  await input.press('Home'); await input.press('Shift+ArrowRight');
  await page.getByRole('button', { name: '切换主题' }).click();
  await page.setViewportSize({ width: 520, height: 720 });
  expect(await surface.getAttribute('data-layouts')).toBe(before);
});

test('unmounting during font work cannot publish into a new editor instance', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route('**/*hebrew*', async route => { requested = true; await held; await route.continue(); });
  await page.goto('/?test=1');
  const panels = page.getByRole('region', { name: '公式编辑' });
  await panels.first().getByRole('button', { name: 'LaTeX 源码（可选）', exact: true }).click();
  await panels.first().getByLabel('LaTeX 源码', { exact: true }).fill('א');
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: '切换公式面板' }).click(); await expect(panels).toHaveCount(1);
  release();
  await page.getByRole('button', { name: '切换公式面板' }).click(); await expect(panels).toHaveCount(2);
  await expect(panels.first().locator('.qk-math-input')).toHaveAttribute('data-ready', 'true');
  await expectMathText(panels.first().locator('.qk-math-input [data-mml-node="math"]'), 'x');
  await expectMathText(panels.last().locator('.qk-math-input [data-mml-node="math"]'), 'z');
});

test('hidden galleries do no work and standalone SVG paints Canvas without external assets', async ({ page }) => {
  const external: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== 'http://127.0.0.1:8988') external.push(request.url()); });
  await page.goto('/');
  const previews = page.locator('.qk-math-gallery .qk-math-svg');
  expect((await previews.evaluateAll(elements => elements.map(element => element.getAttribute('data-layouts')))).every(value => value === '0')).toBe(true);
  await page.getByRole('button', { name: '积分与微分', exact: true }).click();
  const gallery = page.locator('.qk-math-gallery[data-state="open"]'); await expectPreviewsReady(gallery);
  await page.getByRole('textbox', { name: '搜索所有公式模板' }).press('Escape');
  const pixels = await page.evaluate(async () => {
    const { exportFormula } = await import('/export.ts');
    const output = await exportFormula(String.raw`\sqrt{\frac{a}{b}}+\int_{0}^{1}{x^2}dx`);
    const url = URL.createObjectURL(new Blob([output.svg], { type: 'image/svg+xml' }));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = Math.ceil(output.width); canvas.height = Math.ceil(output.height);
      canvas.setAttribute('aria-label', '独立 SVG 的 Canvas 图像');
      canvas.style.display = 'block'; canvas.style.margin = '24px auto';
      const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0; const wrongColors: number[][] = [];
      // Rasterized overlapping path edges allow a few levels of premultiplied-alpha rounding.
      for (let index = 0; index < data.length; index += 4) if (data[index + 3]! > 240) {
        ink++; if (Math.abs(data[index]! - 20) > 5 || Math.abs(data[index + 1]! - 99) > 5 || Math.abs(data[index + 2]! - 255) > 5) wrongColors.push(Array.from(data.slice(index, index + 4)));
      }
      document.querySelector('main')!.append(canvas);
      return { width: image.naturalWidth, height: image.naturalHeight, ink, wrongColors, svg: output.svg };
    } finally { URL.revokeObjectURL(url); }
  });
  expect(pixels.width).toBeGreaterThan(100); expect(pixels.height).toBeGreaterThan(48);
  expect(pixels.ink).toBeGreaterThan(200); expect(pixels.wrongColors).toEqual([]);
  expect(pixels.svg).not.toMatch(/<use\b|<text\b|data-math-slot|href=|url\(/u);
  expect(external).toEqual([]);
  await page.screenshot({ path: '../../.playwright-results/math-ui/mathjax-canvas-export.png' });
});
