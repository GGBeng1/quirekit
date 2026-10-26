import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it } from 'vitest';
import { QuireStatistic } from './index';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';
import type { QuireKitStatisticProps } from './types';

/**
 * Renders the public component with a named metric for semantic assertions.
 * @param props - Optional metric state and formatting inputs.
 * @param locale - Active language, omitted for the default Chinese.
 * @returns Server-rendered HTML.
 */
function renderMetric(props: Partial<QuireKitStatisticProps> = {}, locale?: string): Promise<string> {
  const metric = () => h(QuireStatistic, { title: '文档数量', ...props });
  return renderToString(createSSRApp({ render: () => locale === undefined ? metric() : h(QuireLocaleProvider, { locale }, metric) }));
}

/**
 * Reads default numeric text without the presentation-only soft line break elements.
 * @param html - Server-rendered statistic.
 * @returns The default value's text content.
 */
function valueText(html: string): string {
  return html.match(/<span class="qk-statistic__value">([\s\S]*?)<\/span>/)?.[1]?.replace(/<[^>]*>/g, '') ?? '';
}

it('uses native name-value semantics without adding announcements or focus stops', async () => {
  const html = await renderMetric({ value: 1248, suffix: '份', description: '团队共享文档' });
  expect(html).toContain('<dl');
  expect(html).toContain('<dt');
  expect(html).toContain('<dd');
  expect(valueText(html)).toBe('1,248');
  expect(html.indexOf('文档数量')).toBeLessThan(html.indexOf('qk-statistic__value'));
  expect(html.indexOf('qk-statistic__value')).toBeLessThan(html.indexOf('团队共享文档'));
  expect(html).not.toContain('aria-live');
  expect(html).not.toContain('tabindex');
});

it('formats locale, precision, ratios and large integers through Intl', async () => {
  expect(valueText(await renderMetric({ value: 1234.567, formatOptions: { minimumFractionDigits: 2, maximumFractionDigits: 2 } }, 'de-DE'))).toBe('1.234,57');
  expect(valueText(await renderMetric({ value: 0.865, formatOptions: { style: 'percent', maximumFractionDigits: 1 } }))).toBe('86.5%');
  expect(valueText(await renderMetric({ value: 900719925474099312345n }))).toBe('900,719,925,474,099,312,345');
  expect(valueText(await renderMetric({ value: -12.5 }))).toBe('-12.5');
  expect(valueText(await renderMetric({ value: 0 }))).toBe('0');
});

it('offers soft group breaks without changing exact bigint text or the value slot contract', async () => {
  const value = 900719925474099312345n;
  const expected = '900,719,925,474,099,312,345';
  const html = await renderMetric({ value });
  expect(valueText(html)).toBe(expected);
  expect(html.match(/<wbr>/g)).toHaveLength(6);
  const ungrouped = await renderMetric({ value, formatOptions: { useGrouping: false } });
  expect(valueText(ungrouped)).toBe('900719925474099312345');
  expect(ungrouped).not.toContain('<wbr>');
  const slotted = await renderToString(createSSRApp({
    render: () => h(QuireStatistic, { title: '字符数量', value }, {
      value: ({ formattedValue }: { formattedValue: string }) => h('span', formattedValue),
    }),
  }));
  expect(slotted).toContain(`<span>${expected}</span>`);
  expect(slotted).not.toContain('<wbr>');
});

it.each([undefined, null, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'preserves missing value semantics for %s without rendering misleading units', async (value) => {
    const html = await renderMetric({ ...(value === undefined ? {} : { value }), prefix: '约', suffix: '份', emptyValue: '—' });
    expect(html).toContain('暂无数据');
    expect(html).toContain('aria-hidden="true">—');
    expect(html).not.toContain('qk-statistic__prefix');
    expect(html).not.toContain('qk-statistic__suffix');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
  },
);

it('makes loading override old values and affixes while preserving title and context', async () => {
  const html = await renderMetric({ value: 1248, suffix: '份', loading: true, description: '工作区内容' });
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain('qk-skeleton');
  expect(html).toContain('加载中');
  expect(html).toContain('工作区内容');
  expect(html).not.toContain('1,248');
  expect(html).not.toContain('qk-statistic__suffix');
});

it('keeps custom value content and supplementary controls in the semantic value', async () => {
  const html = await renderToString(createSSRApp({
    render: () => h(QuireStatistic, { title: '存储空间', value: 24.5, size: 'sm' }, {
      title: () => '<存储空间>',
      value: ({ value, formattedValue }: { value: number | bigint; formattedValue: string }) => h('span', `${formattedValue} / ${value}`),
      suffix: () => 'GB',
      description: () => h('button', { type: 'button' }, '查看明细'),
    }),
  }));
  expect(html).toContain('&lt;存储空间&gt;');
  expect(html).toContain('24.5 / 24.5');
  expect(html).toContain('GB');
  expect(html.indexOf('<dd')).toBeLessThan(html.indexOf('<button'));
  expect(html.indexOf('</button>')).toBeLessThan(html.indexOf('</dd>'));
});

it('retains native errors for invalid formatting instead of showing a silently different number', async () => {
  await expect(renderMetric({ value: 42, formatOptions: { style: 'currency' } })).rejects.toThrow(TypeError);
  await expect(renderMetric({ value: 42 }, 'not_a_locale')).rejects.toThrow(RangeError);
});

it('takes accessible state text and number formatting from the active language', async () => {
  const loading = await renderMetric({ title: 'Documents', value: 1248, loading: true }, 'en');
  expect(loading).toContain('Loading');
  const empty = await renderMetric({ title: 'Documents', value: null }, 'en');
  expect(empty).toContain('No data');
  expect(valueText(await renderMetric({ title: 'Documents', value: 1234.5 }, 'en-IN'))).toBe('1,234.5');
  expect(`${loading}${empty}`).not.toMatch(/[\p{Script=Han}]/u);
});
