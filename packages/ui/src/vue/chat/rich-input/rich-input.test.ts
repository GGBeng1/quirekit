// @vitest-environment happy-dom
import { createApp, h, nextTick, reactive, ref } from 'vue';
import { expect, it, vi } from 'vitest';
import RichInput from './rich-input.vue';
import type { QuireKitChatInputCandidate, QuireKitChatInputQuery, QuireKitChatInputSnapshot, QuireKitChatInputToken, QuireKitChatRichInputInstance } from '../../../components/chat/rich-input/types';

/** Flush Vue rendering and one asynchronous candidate resolution. */
async function flush(): Promise<void> { await Promise.resolve(); await Promise.resolve(); await nextTick(); }

/** Enter literal text through the native Textarea event path.
 * @param field - Owned native textarea.
 * @param text - Replacement value.
 */
function type(field: HTMLTextAreaElement, text: string): void {
  field.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText' }));
  field.value = text; field.setSelectionRange(text.length, text.length);
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
}

/** Dispatch one cancelable native keydown.
 * @param field - Focused field.
 * @param key - Browser key.
 * @param init - Optional modifiers.
 * @returns Dispatched event.
 */
function key(field: HTMLTextAreaElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  field.dispatchEvent(event); return event;
}

it('resolves @ and / with editor focus, structured ranges and atomic undo/delete', async () => {
  const state = reactive<{ text: string; tokens: readonly QuireKitChatInputToken[] }>({ text: '', tokens: [] });
  const submit = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(RichInput, {
    modelValue: state.text, tokens: state.tokens, label: '富输入',
    resolveCandidates: (query: QuireKitChatInputQuery): QuireKitChatInputCandidate[] => query.kind === 'mention'
      ? [{ key: 'file:plan', label: 'plan.md', description: '项目文件' }]
      : [{ key: 'cmd:search', label: '搜索' }],
    'onUpdate:modelValue': (value: string) => { state.text = value; },
    'onUpdate:tokens': (value: readonly QuireKitChatInputToken[]) => { state.tokens = value; },
    onSubmit: submit
  }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!;
    field.focus(); type(field, '@p'); await flush();
    const list = host.querySelector('[role=listbox]')!;
    expect(list.textContent).toContain('plan.md');
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute('aria-activedescendant')).toBe(list.querySelector('[role=option]')?.id);
    expect(key(field, 'Enter', { shiftKey: true }).defaultPrevented).toBe(false);
    key(field, 'Enter'); await flush();
    expect(state.text).toBe('@plan.md ');
    expect(state.tokens).toMatchObject([{ key: 'file:plan', kind: 'mention', from: 0, to: 8, text: '@plan.md' }]);
    expect(document.activeElement).toBe(field);
    expect(field.selectionStart).toBe(9);
    type(field, '@plan.md /se'); await flush();
    expect(host.querySelector('[role=listbox]')?.textContent).toContain('搜索');
    host.querySelector<HTMLElement>('[role=option]')!.click(); await flush();
    expect(state.tokens).toHaveLength(2);
    expect(state.text).toBe('@plan.md /搜索 ');
    expect(state.tokens[1]).toMatchObject({ key: 'cmd:search', from: 9, to: 12 });
    expect(key(field, 'z', { metaKey: true }).defaultPrevented).toBe(true); await flush();
    expect(state.text).toBe('@plan.md /se'); expect(state.tokens).toHaveLength(1);
    key(field, 'z', { metaKey: true, shiftKey: true }); await flush();
    expect(state.text).toBe('@plan.md /搜索 '); expect(state.tokens).toHaveLength(2);
    field.setSelectionRange(12, 12); key(field, 'Backspace'); await flush();
    expect(state.text).toBe('@plan.md  '); expect(state.tokens).toHaveLength(1);
    expect(state.tokens[0]?.text).toBe('@plan.md');
    key(field, 'Enter'); expect(submit).toHaveBeenCalledWith(expect.objectContaining({ text: '@plan.md  ', tokens: state.tokens }));
  } finally { app.unmount(); host.remove(); }
});

it('exposes focus and selection, reports resolver failure, and accepts an external draft reset', async () => {
  const state = reactive<{ text: string; tokens: readonly QuireKitChatInputToken[] }>({ text: '初始', tokens: [] });
  const instance = ref<QuireKitChatRichInputInstance>();
  const candidateError = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(RichInput, {
    ref: instance, modelValue: state.text, tokens: state.tokens, label: '富输入',
    resolveCandidates: () => Promise.reject(new Error('候选不可用')),
    'onUpdate:modelValue': (value: string) => { state.text = value; },
    'onUpdate:tokens': (value: readonly QuireKitChatInputToken[]) => { state.tokens = value; },
    onCandidateError: candidateError
  }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!;
    instance.value?.focus();
    expect(document.activeElement).toBe(field);
    instance.value?.setSelection({ from: 1, to: 2 });
    expect(instance.value?.getSnapshot()).toMatchObject({ text: '初始', selection: { from: 1, to: 2 } });
    type(field, '@'); await flush();
    await vi.waitFor(() => expect(candidateError).toHaveBeenCalledOnce());
    state.text = ''; state.tokens = []; await nextTick();
    expect(field.value).toBe('');
    expect(instance.value?.getSnapshot().tokens).toEqual([]);
  } finally { app.unmount(); host.remove(); }
});

it('ignores a canceled late query and keeps IME confirmation separate from submit', async () => {
  const state = reactive<{ text: string; tokens: readonly QuireKitChatInputToken[] }>({ text: '', tokens: [] });
  const pending: Array<{ query: string; signal: AbortSignal; resolve: (items: QuireKitChatInputCandidate[]) => void }> = [];
  const submit = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(RichInput, {
    modelValue: state.text, tokens: state.tokens, label: '富输入',
    resolveCandidates: (query: QuireKitChatInputQuery, signal: AbortSignal) => new Promise<QuireKitChatInputCandidate[]>(resolve => {
      pending.push({ query: query.search, signal, resolve });
    }),
    'onUpdate:modelValue': (value: string) => { state.text = value; },
    'onUpdate:tokens': (value: readonly QuireKitChatInputToken[]) => { state.tokens = value; },
    onSubmit: submit
  }) });
  app.mount(host);
  try {
    const field = host.querySelector('textarea')!;
    field.focus(); type(field, '@old'); await flush();
    expect(pending).toHaveLength(1);
    type(field, '@new'); await flush();
    expect(pending[0]?.signal.aborted).toBe(true);
    pending[0]?.resolve([{ key: 'old', label: '过期' }]); await flush();
    expect(host.querySelector('[role=listbox]')).toBeNull();
    pending[1]?.resolve([{ key: 'new', label: '当前' }]); await flush();
    expect(host.querySelector('[role=listbox]')?.textContent).toContain('当前');
    key(field, 'Escape'); await flush();
    expect(host.querySelector('[role=listbox]')).toBeNull();
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    type(field, '中文');
    expect(key(field, 'Enter', { isComposing: true }).defaultPrevented).toBe(false);
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    await flush();
    expect(submit).not.toHaveBeenCalled();
    key(field, 'Enter');
    expect(submit).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ text: '中文' } satisfies Partial<QuireKitChatInputSnapshot>));
    key(field, 'z', { ctrlKey: true }); await flush();
    expect(state.text).toBe('@new');
  } finally { app.unmount(); host.remove(); }
});
