// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import type { QuireKitChatQuestionAnswer, QuireKitChatQuestionItem, QuireKitChatQuestionState, QuireKitChatQuestionSubmitDetails } from '../../../components/chat';
import QuireChatQuestion from './question.vue';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));
const questions: QuireKitChatQuestionItem[] = [
  { id: 'scope', title: '先检查哪个范围？', kind: 'single', options: [{ value: 'ui', label: '组件库' }, { value: 'docs', label: '文档' }] },
  { id: 'checks', title: '需要哪些检查？', kind: 'multiple', options: [{ value: 'type', label: '类型检查' }, { value: 'visual', label: '视觉检查' }] },
  { id: 'note', title: '补充说明', kind: 'text', required: false }
];

it('validates multiple questions and preserves a controlled draft after submit failure', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = ref<QuireKitChatQuestionState>('pending');
  const draft = ref<readonly QuireKitChatQuestionAnswer[]>([]);
  const submitted: QuireKitChatQuestionSubmitDetails[] = [];
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-7', title: '确定检查范围', questions, state: state.value, draft: draft.value,
    'onUpdate:draft': value => { draft.value = value; }, onSubmit: value => submitted.push(value)
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  await nextTick();
  expect(host.querySelectorAll('.qk-chat-question__required').length).toBe(2);
  expect(submitted).toHaveLength(0);
  host.querySelector<HTMLInputElement>('input[type="radio"][value="ui"]')!.click();
  host.querySelector<HTMLInputElement>('input[type="checkbox"][value="visual"]')!.click();
  await nextTick();
  expect(draft.value).toEqual([{ questionId: 'scope', value: 'ui' }, { questionId: 'checks', value: ['visual'] }]);
  const text = host.querySelector<HTMLTextAreaElement>('textarea')!;
  text.value = '保留现有草稿';
  text.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  expect(submitted).toHaveLength(1);
  expect(submitted[0]?.answers).toEqual([
    { questionId: 'scope', value: 'ui' }, { questionId: 'checks', value: ['visual'] }, { questionId: 'note', value: '保留现有草稿' }
  ]);
  state.value = 'submitting'; await nextTick();
  expect(host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')?.disabled).toBe(true);
  state.value = 'failed'; await nextTick();
  expect(host.querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('保留现有草稿');
  expect(host.querySelector<HTMLInputElement>('input[type="radio"][value="ui"]')?.checked).toBe(true);
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.focus();
  state.value = 'answered'; await nextTick();
  expect(document.activeElement).toBe(host.querySelector('.qk-chat-question'));
});

it('shows confirmed answers without allowing edits, then disables an expired request', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = ref<QuireKitChatQuestionState>('answered');
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-8', title: '已完成的问题', questions, state: state.value,
    answers: [{ questionId: 'scope', value: 'docs' }, { questionId: 'checks', value: ['type'] }]
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  expect(host.textContent).toContain('已回答');
  expect(host.querySelector('.qk-chat-question__summary')?.textContent).toContain('文档');
  expect(host.querySelector('.qk-chat-question__summary')?.textContent).toContain('类型检查');
  expect(host.querySelector('.qk-chat-question__summary')?.textContent).toContain('未回答');
  expect(host.querySelector('input')).toBeNull();
  expect(host.querySelector('.qk-chat-decision__actions')).toBeNull();
  state.value = 'expired'; await nextTick();
  expect(host.textContent).toContain('问题已过期');
  expect(host.querySelectorAll('input:disabled').length).toBeGreaterThan(0);
});

it('submits the latest controlled choice even before a parent render flush', () => {
  const host = document.createElement('div'); document.body.append(host);
  const draft = ref<readonly QuireKitChatQuestionAnswer[]>([]);
  const submitted: QuireKitChatQuestionSubmitDetails[] = [];
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-9', title: '范围', questions: [questions[0]!], state: 'pending', draft: draft.value,
    'onUpdate:draft': value => { draft.value = value; }, onSubmit: value => submitted.push(value)
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  host.querySelector<HTMLInputElement>('input[type="radio"][value="docs"]')!.click();
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  expect(submitted[0]?.answers).toEqual([{ questionId: 'scope', value: 'docs' }]);
});

it('shows a transcript prompt that opens the host answer surface and collapses completed answers', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = ref<QuireKitChatQuestionState>('pending');
  const opened: string[] = [];
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-prompt', title: '确认范围', questions: [questions[0]!], state: state.value,
    presentation: 'prompt', answers: [{ questionId: 'scope', value: 'docs' }],
    onOpen: details => opened.push(details.requestId)
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  expect(host.querySelector('input')).toBeNull();
  host.querySelector<HTMLButtonElement>('button')!.click();
  expect(opened).toEqual(['q-prompt']);
  state.value = 'answered'; await nextTick();
  expect(host.querySelector('.qk-chat-question__summary')).toBeNull();
  host.querySelector<HTMLButtonElement>('button')!.click();
  await nextTick();
  expect(host.querySelector('.qk-chat-question__summary')?.textContent).toContain('文档');
  expect(host.querySelector<HTMLButtonElement>('button')?.getAttribute('aria-expanded')).toBe('true');
});

it('accepts a custom single choice, validates its text, and restores it after switching choices', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = ref<QuireKitChatQuestionState>('pending');
  const draft = ref<readonly QuireKitChatQuestionAnswer[]>([]);
  const submitted: QuireKitChatQuestionSubmitDetails[] = [];
  const customQuestion: QuireKitChatQuestionItem = {
    id: 'scope', title: '先检查哪个范围？', kind: 'single',
    options: [{ value: 'ui', label: '组件库' }],
    customOption: { value: 'other', label: '其他', placeholder: '写下其他范围' }
  };
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-custom', title: '确定检查范围', questions: [customQuestion], state: state.value, draft: draft.value,
    'onUpdate:draft': value => { draft.value = value; }, onSubmit: value => submitted.push(value)
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });

  host.querySelector<HTMLInputElement>('input[type="radio"][value="other"]')!.click();
  await nextTick();
  expect(host.querySelector('.qk-chat-question__custom-field')).not.toBeNull();
  expect(document.activeElement).toBe(host.querySelector('.qk-chat-question__custom-field textarea'));
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  await nextTick();
  expect(host.textContent).toContain('请填写自定义回答');
  expect(submitted).toHaveLength(0);

  const input = host.querySelector<HTMLTextAreaElement>('.qk-chat-question__custom-field textarea')!;
  input.value = '先验证附件预览';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  expect(draft.value).toEqual([{ questionId: 'scope', value: 'other', custom: '先验证附件预览' }]);
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  expect(submitted[0]?.answers).toEqual([{ questionId: 'scope', value: 'other', custom: '先验证附件预览' }]);

  host.querySelector<HTMLInputElement>('input[type="radio"][value="ui"]')!.click();
  await nextTick();
  expect(host.querySelector('.qk-chat-question__custom-field')).toBeNull();
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  expect(submitted[1]?.answers).toEqual([{ questionId: 'scope', value: 'ui' }]);
  host.querySelector<HTMLInputElement>('input[type="radio"][value="other"]')!.click();
  await nextTick();
  expect(host.querySelector<HTMLTextAreaElement>('.qk-chat-question__custom-field textarea')?.value).toBe('先验证附件预览');
  state.value = 'failed'; await nextTick();
  expect(host.querySelector<HTMLTextAreaElement>('.qk-chat-question__custom-field textarea')?.value).toBe('先验证附件预览');
});

it('combines checked options and a custom multiple answer, but omits unselected custom text', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const draft = ref<readonly QuireKitChatQuestionAnswer[]>([]);
  const submitted: QuireKitChatQuestionSubmitDetails[] = [];
  const customQuestion: QuireKitChatQuestionItem = {
    id: 'checks', title: '还需要哪些检查？', kind: 'multiple', required: false,
    options: [{ value: 'type', label: '类型检查' }],
    customOption: { value: 'other', label: '其他检查' }
  };
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-multiple-custom', title: '检查', questions: [customQuestion], state: 'pending', draft: draft.value,
    'onUpdate:draft': value => { draft.value = value; }, onSubmit: value => submitted.push(value)
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });

  host.querySelector<HTMLInputElement>('input[type="checkbox"][value="type"]')!.click();
  await nextTick();
  host.querySelector<HTMLInputElement>('input[type="checkbox"][value="other"]')!.click();
  await nextTick();
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  await nextTick();
  expect(host.textContent).toContain('请填写自定义回答');
  expect(submitted).toHaveLength(0);
  const input = host.querySelector<HTMLTextAreaElement>('.qk-chat-question__custom-field textarea')!;
  input.value = '键盘流程';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await nextTick();
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  expect(submitted[0]?.answers).toEqual([{ questionId: 'checks', value: ['type', 'other'], custom: '键盘流程' }]);
  host.querySelector<HTMLInputElement>('input[type="checkbox"][value="other"]')!.click();
  await nextTick();
  host.querySelector<HTMLButtonElement>('.qk-chat-decision__actions button')!.click();
  expect(submitted[1]?.answers).toEqual([{ questionId: 'checks', value: ['type'] }]);
  host.querySelector<HTMLInputElement>('input[type="checkbox"][value="other"]')!.click();
  await nextTick();
  expect(host.querySelector<HTMLTextAreaElement>('.qk-chat-question__custom-field textarea')?.value).toBe('键盘流程');
});

it('renders the custom response in answered history instead of its option key', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const customQuestion: QuireKitChatQuestionItem = {
    id: 'scope', title: '先检查哪个范围？', kind: 'single',
    options: [{ value: 'ui', label: '组件库' }], customOption: { value: 'other', label: '其他' }
  };
  const app = createApp({ render: () => h(QuireChatQuestion, {
    requestId: 'q-custom-history', title: '确定检查范围', questions: [customQuestion], state: 'answered',
    presentation: 'prompt', answers: [{ questionId: 'scope', value: 'other', custom: '先验证附件预览' }]
  }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  host.querySelector<HTMLButtonElement>('button')!.click();
  await nextTick();
  expect(host.querySelector('.qk-chat-question__summary')?.textContent).toContain('先验证附件预览');
  expect(host.querySelector('.qk-chat-question__summary')?.textContent).not.toContain('other');
});
