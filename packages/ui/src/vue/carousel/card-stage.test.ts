import { createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { describe, expect, it } from 'vitest';
import Carousel from './carousel.vue';

const items = [
  { key: 'report', label: '项目周报' },
  { key: 'review', label: '季度回顾' },
  { key: 'plan', label: '启动计划' },
  { key: 'notes', label: '会议纪要' }
];

/** Renders the card effect without browser measurements.
 * @param props - Scenario overrides.
 * @returns Serialized carousel markup.
 */
async function render(props: Record<string, unknown> = {}): Promise<string> {
  return renderToString(createSSRApp({ render: () => h(Carousel, { items, label: '文档模板', effect: 'card', ...props }, {
    default: ({ item }: { item: (typeof items)[number] }) => h('button', item.label)
  }) }));
}

describe('Carousel card effect', () => {
  it('centers one readable card and keeps receding cards inert', async () => {
    const html = await render({ defaultPage: 1 });
    expect(html).toContain('qk-carousel--card');
    expect(html).toContain('aria-roledescription="carousel"');
    expect(html.match(/aria-roledescription="slide"/g)).toHaveLength(4);
    expect(html.match(/ data-current(?:[ =>])/g)).toHaveLength(2);
    expect(html.match(/ inert(?:[ >])/g)).toHaveLength(3);
    expect(html).toMatch(/aria-label="季度回顾，2 \/ 4"[^>]*aria-hidden="false"/);
    expect(html).toContain('2 / 4');
  });

  it('places neighbors on both sides of the current card when looping', async () => {
    const html = await render();
    expect(html).toMatch(/aria-label="会议纪要，4 \/ 4"[^>]*style="transform:translateX\(-38%\)/);
    expect(html).toMatch(/aria-label="季度回顾，2 \/ 4"[^>]*style="transform:translateX\(38%\)/);
  });

  it('disables the side arrows at bounded ends', async () => {
    const html = await render({ loop: false });
    expect(html).toMatch(/<button(?=[^>]*aria-label="上一页")(?=[^>]*\sdisabled(?:[\s=>]))[^>]*>/);
    expect(html).not.toMatch(/<button(?=[^>]*aria-label="下一页")(?=[^>]*\sdisabled(?:[\s=>]))[^>]*>/);
  });

  it('applies the card width and stage height', async () => {
    const html = await render({ cardWidth: '40%', height: '24rem' });
    expect(html).toContain('height:24rem');
    expect(html).toContain('--qk-carousel-card-width:40%');
    expect(html).toContain('data-fixed');
    expect(await render()).not.toContain('data-fixed');
  });

  it('shows one indicator per item and the default empty text', async () => {
    const html = await render();
    expect(html.match(/class="qk-carousel__indicator"/g)).toHaveLength(4);
    expect(await render({ items: [] })).toContain('暂无内容');
  });
});
