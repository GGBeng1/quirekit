import { effectScope, nextTick, reactive, ref } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { createTaskRequests } from "./requests";
import { useTaskLifecycle } from "./lifecycle";
import type { TaskLifecycleProps } from "./types";

const disposals: Array<() => void> = [];
afterEach(() => disposals.splice(0).forEach(dispose => dispose()));

/** @param props - Public task inputs. @returns An isolated lifecycle with observable requests and notifications. */
function mount(props: TaskLifecycleProps = {}) {
  const state = reactive({ ...props });
  const ownerReady = ref(true);
  const presentation = { ready: ref(true), open: vi.fn(() => "desktop" as const), close: vi.fn() };
  const requests = createTaskRequests("task");
  const events = { updateOpen: vi.fn(), openChange: vi.fn(), begin: vi.fn(), end: vi.fn(), cancel: vi.fn() };
  const scope = effectScope();
  const task = scope.run(() => useTaskLifecycle({ props: state, ownerReady, presentation, requests, events }))!;
  disposals.push(() => scope.stop());
  return { state, ownerReady, presentation, requests, events, task, scope };
}

it("preserves controlled false and reports only acknowledged open transitions", async () => {
  const { state, task, events } = mount({ open: false, defaultOpen: true });
  expect(task.open.value).toBe(false);
  expect(events.openChange).not.toHaveBeenCalled();
  task.requestOpen();
  expect(events.updateOpen).toHaveBeenLastCalledWith(true);
  expect(task.open.value).toBe(false);
  state.open = true;
  expect(events.openChange.mock.calls).toEqual([[true]]);
  expect(task.requestClose("escape")).toBe(true);
  expect(task.open.value).toBe(true);
  expect(events.openChange.mock.calls).toEqual([[true]]);
  await nextTick();
  state.open = false;
  expect(events.openChange.mock.calls).toEqual([[true], [false]]);
  expect(events.cancel.mock.calls[0]?.[0].reason).toBe("host-close");
});

it("aborts both channels on owner hiding, retains the request, and starts a fresh session on recovery", () => {
  const { ownerReady, requests, task, events } = mount({ defaultOpen: true });
  const first = requests.sessionId.value;
  const submit = requests.startSubmission()!;
  const search = requests.startSearch()!;
  ownerReady.value = false;
  expect(task.requestedOpen.value).toBe(true);
  expect(task.open.value).toBe(false);
  expect(submit.signal.aborted).toBe(true);
  expect(search.signal.aborted).toBe(true);
  expect(events.updateOpen).not.toHaveBeenCalled();
  expect(events.cancel).toHaveBeenCalledWith({ reason: "owner-hidden", sessionId: first });
  ownerReady.value = true;
  expect(requests.sessionId.value).not.toBe(first);
  expect(requests.submitting.value).toBe(false);
  expect(events.begin).toHaveBeenCalledTimes(2);
});

it("guards busy user close but accepts authoritative host close and disabled state", () => {
  const guard = vi.fn();
  const { state, requests, task, events } = mount({ open: true, onCloseRequest: guard });
  const request = requests.startSubmission()!;
  expect(task.requestClose("cancel")).toBe(false);
  expect(guard).not.toHaveBeenCalled();
  state.open = false;
  expect(request.signal.aborted).toBe(true);
  expect(events.cancel.mock.calls[0]?.[0].reason).toBe("host-close");
  state.open = true;
  state.disabled = true;
  expect(task.open.value).toBe(false);
  state.disabled = false;
  expect(task.open.value).toBe(true);
});

it("does not resurrect an uncontrolled request after disabling, or cancel a successful close", () => {
  const { state, task, events } = mount({ defaultOpen: true });
  state.disabled = true;
  state.disabled = false;
  expect(task.open.value).toBe(false);
  task.requestOpen();
  events.cancel.mockClear();
  expect(task.requestClose("action")).toBe(true);
  expect(task.open.value).toBe(false);
  expect(events.cancel).not.toHaveBeenCalled();
});

it("rejects reentrant guards and releases pending requests without emitting after disposal", () => {
  const { state, task, requests, scope, events } = mount({ defaultOpen: true });
  state.onCloseRequest = request => {
    expect(task.requestClose()).toBe(false);
    request.preventDefault();
  };
  expect(task.requestClose("escape")).toBe(false);
  const request = requests.startSubmission()!;
  events.openChange.mockClear();
  scope.stop();
  expect(request.signal.aborted).toBe(true);
  expect(events.openChange).not.toHaveBeenCalled();
});
