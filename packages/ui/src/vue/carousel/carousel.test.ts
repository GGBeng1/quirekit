import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import Carousel from './carousel.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

const items = [
  { key: 'report', label: '项目周报', note: '每周进展' },
  { key: 'review', label: '季度回顾', note: '里程碑总结' },
  { key: 'plan', label: '启动计划', note: '目标与分工' }
];

/** Renders the public contract without browser measurements.
 * @param props - Scenario overrides for the default item set.
 * @returns Serialized accessible carousel markup.
 */
async function render(props: Record<string, unknown> = {}): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(Carousel, { items, label: '文档模板', ...props }, {
    default: ({ item }: { item: (typeof items)[number] }) => h('button', item.note)
  }) }));
}

describe('Carousel content semantics', () => {
  it('names the region and each slide while keeping original slot data', async () => {
    const html = await render();
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="文档模板"');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html).toContain('aria-label="项目周报，1 / 3"');
    expect(html).toContain('每周进展');
  });

  it('keeps the starting slide readable and offscreen content inert before hydration', async () => {
    const html = await render({ defaultPage: 1 });
    expect(html.match(/ inert(?:[ >])/g)).toHaveLength(2);
    expect(html).toMatch(/aria-label="季度回顾，2 \/ 3"[^>]*aria-hidden="false"/);
    expect(html).toContain('2 / 3');
  });

  it('projects a controlled page instead of its initial fallback', async () => {
    const html = await render({ page: 2, defaultPage: 0 });
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('3 / 3');
  });

  it('keeps both ends navigable by default and permits explicitly bounded navigation', async () => {
    const first = await render();
    const last = await render({ defaultPage: 2 });
    expect(first).not.toMatch(/<button(?=[^>]*aria-label="上一页")(?=[^>]*\sdisabled(?:[\s=>]))[^>]*>/);
    expect(last).not.toMatch(/<button(?=[^>]*aria-label="下一页")(?=[^>]*\sdisabled(?:[\s=>]))[^>]*>/);
    const boundedFirst = await render({ loop: false });
    const boundedLast = await render({ loop: false, defaultPage: 2 });
    expect(boundedFirst).toMatch(/<button(?=[^>]*aria-label="上一页")(?=[^>]*\sdisabled(?:[\s=>]))[^>]*>/);
    expect(boundedLast).toMatch(/<button(?=[^>]*aria-label="下一页")(?=[^>]*\sdisabled(?:[\s=>]))[^>]*>/);
  });

  it('renders an explicit empty state without phantom navigation', async () => {
    const html = await render({ items: [] });
    expect(html).toContain('暂无内容');
    expect(html).not.toContain('aria-roledescription="slide"');
    expect(html).not.toContain('下一页');
    expect(html).not.toContain('1 / 0');
  });

  it('disables both navigation directions for a single slide even when loop is enabled', async () => {
    const html = await render({ items: items.slice(0, 1), loop: true });
    expect(html).toMatch(/<button(?=[^>]*aria-label="上一页")(?=[^>]*disabled)[^>]*>/);
    expect(html).toMatch(/<button(?=[^>]*aria-label="下一页")(?=[^>]*disabled)[^>]*>/);
    expect(html).toContain('1 / 1');
  });

  it('groups multiple visible slides into page indicators rather than per-item dots', async () => {
    const html = await render({ slidesPerPage: 2 });
    expect(html).toContain('--slides-per-page:2');
    expect(html.match(/class="qk-carousel__indicator"/g)).toHaveLength(2);
    expect(html.match(/ inert(?:[ >])/g)).toHaveLength(1);
  });

  it('exposes disabled navigation without disabling current content actions', async () => {
    const html = await render({ disabled: true });
    expect(html).toContain('data-disabled');
    expect(html).toContain('<button>每周进展</button>');
  });

  it('takes navigation and slide names from the active language', async () => {
    const english = [{ key: 'a', label: 'Weekly report' }, { key: 'b', label: 'Review' }];
    const html = await renderToString(createSSRApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(Carousel, { items: english, label: 'Templates' })) }));
    expect(html).toContain('aria-label="Weekly report, 1 of 2"');
    expect(html).toContain('aria-label="Previous page"');
    expect(html).toContain('aria-label="Next page"');
    expect(html).not.toMatch(/[\p{Script=Han}]/u);
    const empty = await renderToString(createSSRApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(Carousel, { items: [], label: 'Templates' })) }));
    expect(empty).toContain('No content');
  });
});
