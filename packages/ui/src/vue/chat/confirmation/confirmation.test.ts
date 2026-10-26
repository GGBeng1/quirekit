// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { createApp, h, nextTick, ref } from 'vue';
import QuireChatConfirmation from './confirmation.vue';
import type { QuireKitChatConfirmationDecision, QuireKitChatConfirmationState } from '../../../components/chat';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

it('emits a decision intent but waits for the host to approve, and retries after failure', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const state = ref<QuireKitChatConfirmationState>('pending');
  const decisions: QuireKitChatConfirmationDecision[] = [];
  const app = createApp({ render: () => h(QuireChatConfirmation, {
    requestId: 'approve-7', title: '允许读取当前文件？', state: state.value,
    onDecide: details => decisions.push(details)
  }, { default: () => h('p', { 'data-review-evidence': '' }, '即将读取：产品说明.docx') }) });
  app.mount(host);
  cleanups.push(() => { app.unmount(); host.remove(); });
  host.querySelector<HTMLButtonElement>('button')!.click();
  expect(decisions).toEqual([{ requestId: 'approve-7', decision: 'approve' }]);
  expect(host.textContent).toContain('等待确认');
  state.value = 'submitting'; await nextTick();
  expect([...host.querySelectorAll('button')].every(button => button.disabled)).toBe(true);
  state.value = 'failed'; await nextTick();
  expect(host.textContent).toContain('提交失败，可重试');
  [...host.querySelectorAll<HTMLButtonElement>('button')][1]!.click();
  expect(decisions.at(-1)).toEqual({ requestId: 'approve-7', decision: 'reject' });
  host.querySelector<HTMLButtonElement>('button')!.focus();
  state.value = 'rejected'; await nextTick();
  expect(host.querySelectorAll('button').length).toBe(0);
  expect(host.textContent).toContain('已拒绝');
  expect(host.querySelector('[data-review-evidence]')?.textContent).toBe('即将读取：产品说明.docx');
  expect(document.activeElement).toBe(host.querySelector('.qk-chat-confirmation'));
});

it('words a review decision differently from a permission request', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(() => h(QuireChatConfirmation, { requestId: 'r', title: 'Edit section', state: 'pending', intent: 'review' }));
  app.mount(host);
  expect(host.textContent).toContain('批准');
  expect(host.textContent).not.toContain('允许');
  app.unmount(); host.remove();
});
