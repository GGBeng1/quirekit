// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive } from 'vue';
import { expect, it } from 'vitest';
import Timeline from './timeline.vue';
import type { QuireKitTimelineItem, QuireKitTimelineItemContext } from './types';

it('reverses DOM chronology without mutating records or changing the original slot index', async () => {
  const items: readonly QuireKitTimelineItem[] = Object.freeze([
    Object.freeze({ key: 'first', title: '第一条' }), Object.freeze({ key: 'second', title: '第二条' })
  ]);
  const state = reactive({ reverse: false });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Timeline, { items, reverse: state.reverse }, {
    content: ({ item, index }: QuireKitTimelineItemContext) => h('span', `${item.key}:${index}`)
  }) });
  app.mount(host);
  try {
    const first = host.querySelector('[data-key="first"]');
    state.reverse = true; await nextTick();
    expect([...host.querySelectorAll('li')].map(item => item.getAttribute('data-key'))).toEqual(['second', 'first']);
    expect([...host.querySelectorAll('.qk-timeline__content')].map(item => item.textContent)).toEqual(['second:1', 'first:0']);
    expect(host.querySelector('[data-key="first"]')).toBe(first);
    expect(items.map(item => item.key)).toEqual(['first', 'second']);
  } finally { app.unmount(); host.remove(); }
});

it('keeps display times literal, exposes only supplied machine dates and leaves actions to the host', async () => {
  const state = reactive({ empty: false });
  let calls = 0;
  const items: readonly QuireKitTimelineItem[] = [
    { key: 'exact', title: '<script>literal</script>', time: '今天 09:10', dateTime: '2026-09-12T09:10:00+08:00', status: 'success', statusLabel: '已通过' },
    { key: 'relative', title: '待安排', time: '稍后', status: 'info' }
  ];
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(Timeline, { items: state.empty ? [] : items }, {
    content: ({ item }: QuireKitTimelineItemContext) => item.key === 'exact' ? h('button', { onClick: () => { calls++; } }, '查看详情') : null,
    empty: () => h('p', '没有操作记录')
  }) });
  app.mount(host);
  try {
    expect(host.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-12T09:10:00+08:00');
    expect(host.querySelectorAll('time')).toHaveLength(1);
    expect(host.querySelector('[data-key="relative"] .qk-timeline__time')?.textContent).toBe('稍后');
    expect(host.querySelector('script')).toBeNull();
    expect(host.querySelector('.qk-timeline__title')?.textContent).toBe('<script>literal</script>');
    expect(host.querySelector('.qk-timeline__status')?.textContent).toBe('已通过');
    host.querySelector<HTMLButtonElement>('button')!.click();
    expect(calls).toBe(1);
    state.empty = true; await nextTick();
    expect(host.querySelector('ol')).toBeNull();
    expect(host.textContent).toBe('没有操作记录');
  } finally { app.unmount(); host.remove(); }
});
