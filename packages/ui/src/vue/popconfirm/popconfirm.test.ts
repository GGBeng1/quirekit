// @vitest-environment happy-dom
import { createApp, defineComponent, h, reactive } from 'vue';
import { afterEach, expect, it, vi } from 'vitest';
import DialogRoot from '../dialog/root.vue';
import { usePopconfirm } from './use-popconfirm';
import type { PopconfirmInput } from './types';
import type { QuireKitTaskRequestContext } from '../../components/task/types';

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(dispose => dispose()));
/** @param input - Live host props. @returns Mounted controller and event spies. */
function mount(input: PopconfirmInput = {}) {
  const props = reactive({ title: 'Remove?', defaultOpen: true, ...input });
  const events = { updateOpen: vi.fn(), cancel: vi.fn(), confirm: vi.fn(), confirmError: vi.fn() };
  let api!: ReturnType<typeof usePopconfirm>;
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ setup() { api = usePopconfirm(props, events, 'test'); return () => h('div'); } });
  app.mount(host);
  let disposed = false;
  const dispose = () => { if (disposed) return; disposed = true; app.unmount(); host.remove(); };
  cleanups.push(dispose);
  return { props, events, api, dispose };
}

it('locks duplicate submission and dismissal, then permits retry after failure', async () => {
  let reject!: (error: unknown) => void;
  const action = vi.fn(() => new Promise<void>((_, rejectPromise) => { reject = rejectPromise; }));
  const { api, events, props } = mount({ confirmAction: action });
  const first = api.confirm(); await api.confirm(); api.interact(false);
  expect(action).toHaveBeenCalledTimes(1); expect(events.cancel).not.toHaveBeenCalled();
  reject(new Error('offline')); await first;
  expect(api.failed.value).toBe(true); expect(api.open.value).toBe(true);
  expect(events.confirmError).toHaveBeenCalledOnce();
  props.confirmAction = () => true;
  await api.confirm();
  expect(events.confirm).toHaveBeenCalledOnce(); expect(api.open.value).toBe(false);
});

it('aborts a replaced session and ignores its success without closing the new one', async () => {
  let resolve!: () => void;
  let context!: QuireKitTaskRequestContext;
  const { props, api, events } = mount({ open: true, confirmAction: request => {
    context = request; return new Promise<void>(done => { resolve = done; });
  } });
  const pending = api.confirm(); props.open = false;
  expect(context.signal.aborted).toBe(true);
  props.open = true; resolve(); await pending;
  expect(api.open.value).toBe(true); expect(events.confirm).not.toHaveBeenCalled();
  expect(events.updateOpen).not.toHaveBeenCalled(); expect(api.submitting.value).toBe(false);
});

it('preserves explicit false, respects controlled refusal and aborts on disable and unmount', async () => {
  const { api, props, events, dispose } = mount({ open: true, confirmAction: () => false });
  await api.confirm(); expect(events.confirm).not.toHaveBeenCalled(); expect(api.open.value).toBe(true);
  api.interact(false); expect(events.cancel).toHaveBeenCalledOnce(); expect(api.open.value).toBe(true);
  const signals: AbortSignal[] = [];
  props.confirmAction = context => { signals.push(context.signal); return new Promise<void>(() => {}); };
  void api.confirm(); props.disabled = true; expect(signals[0]?.aborted).toBe(true);
  props.disabled = false; void api.confirm(); dispose();
  expect(signals[1]?.aborted).toBe(true);
});


it('invalidates pending work when a retained parent Dialog hides', async () => {
  const state = reactive({ open: true });
  let context!: QuireKitTaskRequestContext;
  let reject!: (error: unknown) => void;
  let api!: ReturnType<typeof usePopconfirm>;
  const error = vi.fn();
  const Child = defineComponent({ setup() {
    api = usePopconfirm({ title: 'Confirm', open: true, confirmAction: request => {
      context = request; return new Promise<void>((_, fail) => { reject = fail; });
    } }, { updateOpen: vi.fn(), cancel: vi.fn(), confirm: vi.fn(), confirmError: error }, 'nested');
    return () => h('div');
  } });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ render: () => h(DialogRoot, { open: state.open }, () => h(Child)) });
  app.mount(host); cleanups.push(() => { app.unmount(); host.remove(); });
  await vi.waitFor(() => expect(api.open.value).toBe(true));
  const pending = api.confirm(); state.open = false;
  await vi.waitFor(() => expect(context.signal.aborted).toBe(true));
  state.open = true; await vi.waitFor(() => expect(api.open.value).toBe(true));
  reject(new Error('stale')); await pending;
  expect(error).not.toHaveBeenCalled(); expect(api.failed.value).toBe(false);
});
