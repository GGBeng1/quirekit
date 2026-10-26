// @vitest-environment happy-dom
import { createApp, createSSRApp, h, nextTick, reactive } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { expect, it, vi } from 'vitest';
import Transfer from './transfer.vue';
import Field from '../field/field.vue';
import QuireLocaleProvider from '../locale-provider/locale-provider.vue';

const items = [
  { value: 'a', label: '林溪' }, { value: 'b', label: '周宁' }, { value: 'c', label: '陈知', disabled: true }
];

/** Click an existing rendered task control by its readable label.
 * @param host - Mounted fixture root.
 * @param name - Exact button label.
 */
function clickButton(host: HTMLElement, name: string): void {
  const button = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === name);
  if (!button) throw new Error(`Missing button ${name}`);
  button.click();
}

it('renders separate membership lists and serializes unique target keys including unavailable ones', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Transfer, { items, label: '评审成员', defaultValue: ['b', 'missing', 'b', 'c'], name: 'members' }) }));
  expect(html.match(/role="listbox"/g)).toHaveLength(2);
  expect(html.match(/type="hidden" name="members"/g)).toHaveLength(3);
  expect(html).toContain('value="missing"');
  expect(html).toContain('1 项暂不在候选列表中');
  expect(html).toContain('aria-multiselectable="true"');
  expect(html).toContain('aria-disabled="true"');
});

it('respects a rejecting controlled owner, live item locks and readonly membership', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ readOnly: false, disabled: false });
  const update = vi.fn();
  const app = createApp({ render: () => h(Transfer, { items, modelValue: ['b'], ...state, 'onUpdate:modelValue': update }) });
  app.mount(host);
  try {
    const option = host.querySelector<HTMLElement>('[data-transfer-side="source"] [data-value="a"]')!;
    option.click();
    await vi.waitFor(() => expect(option.getAttribute('aria-selected')).toBe('true'));
    clickButton(host, '加入');
    await vi.waitFor(() => expect(update).toHaveBeenCalledExactlyOnceWith(['b', 'a']));
    expect(host.querySelector('[data-transfer-side="source"] [data-value="a"]')).not.toBeNull();
    state.readOnly = true; await nextTick();
    option.click(); await nextTick();
    clickButton(host, '加入');
    expect(update).toHaveBeenCalledTimes(1);
    state.disabled = true; await nextTick();
    expect([...host.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled)).toBe(true);
  } finally { app.unmount(); host.remove(); }
});

it('inherits Field state with unique nested identities, required focus and native reset', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = reactive({ disabled: false, readOnly: false, invalid: true });
  const app = createApp({ render: () => h('form', {}, [h(Field, {
    ...state, id: 'review-members', label: '评审成员', required: true, errorText: '选择评审成员。'
  }, { default: () => h(Transfer, { items, defaultValue: ['b'], name: 'members', searchable: true }) })]) });
  app.mount(host);
  try {
    await nextTick();
    const form = host.querySelector('form')!;
    expect(new FormData(form).getAll('members')).toEqual(['b']);
    const ids = [...host.querySelectorAll('[id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const input = host.querySelector<HTMLInputElement>('#review-members')!;
    expect(input.required).toBe(true);
    expect(form.checkValidity()).toBe(true);
    await vi.waitFor(() => expect(input.getAttribute('aria-describedby')).toContain('error-text'));
    host.querySelector<HTMLElement>('[data-transfer-side="target"] [data-value="b"]')!.click();
    await nextTick();
    clickButton(host, '移回');
    await vi.waitFor(() => expect(new FormData(form).getAll('members')).toEqual([]));
    expect(form.checkValidity()).toBe(false);
    expect(document.activeElement?.getAttribute('role')).toBe('listbox');
    form.reset();
    await vi.waitFor(() => expect(new FormData(form).getAll('members')).toEqual(['b']));
    state.readOnly = true; await nextTick();
    expect(input.readOnly).toBe(true);
    expect(new FormData(form).getAll('members')).toEqual(['b']);
    state.disabled = true; await nextTick();
    expect(new FormData(form).getAll('members')).toEqual([]);
    expect(input.disabled).toBe(true);
  } finally { app.unmount(); host.remove(); }
});

it('clears temporary selections when filtering and leaves native form searches unnamed', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h('form', {}, [h(Transfer, { items, searchable: true, defaultValue: [], name: 'members' })]) });
  app.mount(host);
  try {
    const option = host.querySelector<HTMLElement>('[data-value="a"]')!;
    option.click(); await vi.waitFor(() => expect(option.getAttribute('aria-selected')).toBe('true'));
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索待选"]')!;
    search.value = '周'; search.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(host.querySelectorAll('[aria-selected="true"]')).toHaveLength(0));
    expect([...new FormData(host.querySelector('form')!).keys()]).toEqual([]);
    expect(host.querySelector('[data-transfer-side="source"] [data-value="a"]')).toBeNull();
  } finally { app.unmount(); host.remove(); }
});

it('reads actions, list names and feedback from the active language', async () => {
  const people = [{ value: 'a', label: 'Lin' }, { value: 'b', label: 'Zhou' }];
  const html = await renderToString(createSSRApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () =>
    h(Transfer, { items: people, searchable: true, defaultValue: ['a', 'missing'] })) }));
  for (const text of ['Member selection', 'Available', 'Selected', 'Add', 'Remove', 'Search Available', 'Search names or descriptions', 'Select all </span>Available', '1 item is not in the current list'])
    expect(html).toContain(text);
  expect(html).not.toMatch(/[\p{Script=Han}]/u);
  const empty = await renderToString(createSSRApp({ render: () => h(QuireLocaleProvider, { locale: 'en' }, () => h(Transfer, { items: [] })) }));
  expect(empty).toContain('No options');
});
