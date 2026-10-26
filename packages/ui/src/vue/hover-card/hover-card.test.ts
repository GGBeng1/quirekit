// @vitest-environment happy-dom
import { createApp, h, reactive } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import Root from './root.vue';
import Trigger from './trigger.vue';
import Content from './content.vue';
import DialogRoot from '../dialog/root.vue';
import DialogContent from '../dialog/content.vue';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(dispose => dispose()));

it('suspends retained modal previews and disabled requests without overwriting the controlled value', async () => {
  const state = reactive({ ownerOpen: false, disabled: false });
  const requested = vi.fn();
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(DialogRoot, {
    open: state.ownerOpen, lazyMount: false, unmountOnExit: false
  }, () => h(DialogContent, { title: 'Owner' }, () => h(Root, {
    open: true, disabled: state.disabled, 'onUpdate:open': requested
  }, () => [h(Trigger, {}, () => 'Preview'), h(Content, {}, () => 'Member summary')])))});
  app.mount(host); cleanups.push(() => { app.unmount(); host.remove(); });
  const visible = () => document.querySelector('.qk-hover-card__content[data-state="open"]');
  expect(visible()).toBeNull();
  state.ownerOpen = true;
  await vi.waitFor(() => expect(visible()).not.toBeNull());
  state.disabled = true;
  await vi.waitFor(() => expect(visible()).toBeNull());
  state.disabled = false;
  await vi.waitFor(() => expect(visible()).not.toBeNull());
  state.ownerOpen = false;
  await vi.waitFor(() => expect(visible()).toBeNull());
  state.ownerOpen = true;
  await vi.waitFor(() => expect(visible()).not.toBeNull());
  expect(requested).not.toHaveBeenCalled();
});
