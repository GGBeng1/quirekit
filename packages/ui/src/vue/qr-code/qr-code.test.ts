import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import { QuireQRCode } from './index';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
import type { QuireKitQRCodeActionsSlotProps, QuireKitQRCodeProps } from './types';

/**
 * Renders a public QR code for SSR contracts without using an encoder as the test oracle.
 * @param props - Content and optional rendering configuration.
 * @returns Serialized component markup.
 */
function renderCode(props: Partial<QuireKitQRCodeProps> = {}): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(QuireQRCode, {
    value: 'https://quirekit.dev/docs/review', label: '文档链接二维码', ...props,
  }) }));
}

it('renders an accessible static image with an explicit white background and black modules', async () => {
  const html = await renderCode();
  expect(html).toContain('data-state="ready"');
  expect(html).toContain('role="img"');
  expect(html).toContain('aria-label="文档链接二维码"');
  expect(html).toContain('fill="#fff"');
  expect(html).toContain('fill="#000"');
  expect(html).toContain('width="160"');
  expect(html).not.toContain('tabindex');
  expect(html).not.toContain('aria-live');
});

it('keeps four complete white modules on each side inside the SVG viewBox', async () => {
  const html = await renderCode({ value: '12345' });
  const size = Number(html.match(/viewBox="0 0 (\d+) \d+"/)?.[1]);
  const path = html.match(/d="(M\d[^\"]+)"/)?.[1] ?? '';
  const coordinates = [...path.matchAll(/M(\d+),(\d+)h1v1h-1z/g)].map(match => [Number(match[1]), Number(match[2])]);
  expect(coordinates.length).toBeGreaterThan(0);
  expect(Math.min(...coordinates.map(point => point[0]!))).toBe(4);
  expect(Math.min(...coordinates.map(point => point[1]!))).toBe(4);
  expect(Math.max(...coordinates.map(point => point[0]!))).toBe(size - 5);
  expect(Math.max(...coordinates.map(point => point[1]!))).toBe(size - 5);
});

it('preserves whitespace and Unicode as data and responds to error correction', async () => {
  const plain = await renderCode({ value: '文档审阅 📝' });
  const padded = await renderCode({ value: ' 文档审阅 📝 ' });
  expect(plain).toContain('data-state="ready"');
  expect(padded).toContain('data-state="ready"');
  expect(plain).not.toBe(padded);
  expect(await renderCode({ errorCorrection: 'H' })).not.toBe(await renderCode({ errorCorrection: 'L' }));
});

it('shows empty feedback without exposing a scannable empty symbol', async () => {
  const html = await renderCode({ value: '' });
  expect(html).toContain('data-state="empty"');
  expect(html).toContain('输入内容后生成二维码');
  expect(html).not.toContain('<svg');
});

it('contains encoding capacity errors and retains host actions', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(QuireQRCode, { value: '文'.repeat(5000), label: '文档二维码' }, {
      actions: ({ status }: { status: string }) => h('button', { type: 'button', disabled: status !== 'ready' }, '下载'),
    }),
  }));
  expect(html).toContain('data-state="error"');
  expect(html).toContain('无法生成二维码，请检查或缩短内容');
  expect(html).not.toContain('<svg');
  expect(html).toContain('disabled');
});

it('normalizes invalid display sizes without changing content', async () => {
  for (const size of [0, -1, Infinity, Number.NaN]) {
    expect(await renderCode({ size })).toContain('width="160"');
  }
  expect(await renderCode({ size: 240 })).toContain('width="240"');
});

it('rejects export requests when rendering has not mounted a browser symbol', async () => {
  let actions: QuireKitQRCodeActionsSlotProps | undefined;
  await renderToString(createSSRApp({
    render: () => h(QuireQRCode, { value: 'QuireKit', label: '文档二维码' }, {
      actions: (context: QuireKitQRCodeActionsSlotProps) => { actions = context; return []; },
    }),
  }));
  expect(actions?.status).toBe('ready');
  await expect(actions?.getDataUrl('svg')).rejects.toThrow('二维码尚未生成或挂载');
  await expect(actions?.download()).rejects.toThrow('二维码尚未生成或挂载');
});

it('takes feedback text from the active language', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(QuireQRCode, { value: '', label: 'Review link' })),
  }));
  expect(html).toContain('Enter content to generate a QR code');
  expect(html).not.toMatch(/[\p{Script=Han}]/u);
});
