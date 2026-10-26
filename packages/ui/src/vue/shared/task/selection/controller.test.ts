import { effectScope, nextTick, reactive } from "vue";
import { afterEach, expect, it, vi } from "vitest";
import { createTaskRequests } from "../session/requests";
import { useTaskSelection } from "./controller";
import type { TaskSelectionItem, TaskSelectionProps, TaskSelectionRequest } from "./types";

/** Writable host fixture retaining the actual readonly consumer contract. */
type HostProps = { -readonly [Key in keyof TaskSelectionProps<TaskSelectionItem>]: TaskSelectionProps<TaskSelectionItem>[Key] };
const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()));

/** @param initial - Host-owned selection inputs. @returns A real scoped selection controller. */
function fixture(initial: Partial<HostProps> = {}) {
  const props = reactive<HostProps>({ items: [{ value: "a", label: "Alpha" }, { value: "b", label: "Beta" }, { value: "c", label: "Gamma", disabled: true }], ...initial });
  const requests = createTaskRequests("fixture");
  const events = { updateValue: vi.fn(), commit: vi.fn(), error: vi.fn(), updateQuery: vi.fn(), search: vi.fn(), success: vi.fn() };
  const scope = effectScope();
  const selection = scope.run(() => useTaskSelection({ props, requests, events }))!;
  requests.begin(); selection.reset();
  cleanups.push(() => { requests.end(); scope.stop(); });
  return { props, requests, events, selection };
}

/** @returns A manually settled business promise, without timing-dependent tasks. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((accept, refuse) => { resolve = accept; reject = refuse; });
  return { promise, resolve, reject };
}

it("keeps explicit drafts separate, preserves filtered selections and validates disappearing additions", async () => {
  const { props, selection, events } = fixture({ selectionMode: "multiple", defaultValue: ["a"] });
  selection.select(["a", "b"]);
  expect(events.updateValue).not.toHaveBeenCalled();
  selection.query.input("beta");
  expect(selection.query.visibleItems.value.map(item => item.value)).toEqual(["b"]);
  expect(selection.draft.value).toEqual(["a", "b"]);
  props.items = [{ value: "a", label: "Alpha" }];
  await selection.confirm();
  expect(selection.invalid.value).toBe(true);
  expect(events.commit).not.toHaveBeenCalled();
  selection.reset();
  expect(selection.draft.value).toEqual(["a"]);
  expect(selection.query.query.value).toBe("");
});

it("locks synchronously, retains failure state and retries with a fresh request identity", async () => {
  const first = deferred(), second = deferred();
  const submit = vi.fn().mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  const { selection, requests, events } = fixture({ submit, defaultValue: ["a"] });
  selection.query.input("beta"); selection.highlighted.value = "b";
  selection.select(["b"]); selection.select(["a"]); void selection.confirm();
  expect(submit).toHaveBeenCalledOnce();
  expect(requests.submitting.value).toBe(true);
  const request = submit.mock.calls[0]![0];
  expect(Object.isFrozen(request.value)).toBe(true);
  expect(request.previousValue).toEqual(["a"]);
  first.reject(new Error("offline"));
  await vi.waitFor(() => expect(selection.failed.value).toBe(true));
  expect(selection.query.query.value).toBe("beta");
  expect(selection.highlighted.value).toBe("b");
  expect(selection.draft.value).toEqual(["b"]);
  const retry = selection.confirm();
  expect(submit.mock.calls[1]![0].requestId).toBeGreaterThan(request.requestId);
  second.resolve(); await retry;
  expect(selection.committed.value).toEqual(["b"]);
  expect(events.commit).toHaveBeenCalledOnce();
  expect(events.success).toHaveBeenCalledOnce();
});

it("ignores semantic model echoes but aborts genuinely replaced controlled values", async () => {
  const pending = deferred();
  const submit = vi.fn((_request: TaskSelectionRequest) => pending.promise);
  const { props, selection, events } = fixture({ modelValue: ["a"], submit });
  selection.query.input("beta"); selection.select(["b"]);
  const request = submit.mock.calls[0]![0];
  props.modelValue = ["a"];
  expect(request.signal.aborted).toBe(false);
  props.modelValue = ["c"];
  expect(request.signal.aborted).toBe(true);
  expect(selection.draft.value).toEqual(["c"]);
  expect(selection.query.query.value).toBe("beta");
  pending.resolve(); await nextTick(); await nextTick();
  expect(events.commit).not.toHaveBeenCalled();
  expect(events.error).not.toHaveBeenCalled();
});

it("preserves host authority when it declines a successful controlled value update", async () => {
  const { selection, events } = fixture({ modelValue: ["a"] });
  selection.select(["b"]);
  await nextTick(); await nextTick();
  expect(events.updateValue).toHaveBeenCalledExactlyOnceWith(["b"]);
  expect(events.commit).toHaveBeenCalledOnce();
  expect(selection.committed.value).toEqual(["a"]);
  expect(selection.draft.value).toEqual(["a"]);
});

it("aborts ended sessions and never replays a stale submit or search after recovery", async () => {
  const pending = deferred();
  const submit = vi.fn((_request: TaskSelectionRequest) => pending.promise);
  const { selection, requests, events } = fixture({ submit });
  selection.query.input("beta"); selection.select(["b"]);
  const oldRequest = submit.mock.calls[0]![0];
  const oldSearch = events.search.mock.calls[0]![0];
  requests.end(); selection.reset(); requests.begin(); selection.reset();
  expect(oldRequest.signal.aborted).toBe(true);
  expect(oldSearch.signal.aborted).toBe(true);
  expect(selection.draft.value).toEqual([]);
  expect(selection.query.query.value).toBe("");
  pending.resolve(); await nextTick(); await nextTick();
  expect(events.commit).not.toHaveBeenCalled();
  expect(submit).toHaveBeenCalledOnce();
  expect(events.search).toHaveBeenCalledOnce();
});

it("keeps baseline unavailable values while refusing disabled additions and incompatible modes", async () => {
  const { selection, events } = fixture({ selectionMode: "multiple", defaultValue: ["missing", "c"] });
  selection.select(["missing", "c", "a"]);
  await selection.confirm();
  expect(events.updateValue).toHaveBeenCalledExactlyOnceWith(["missing", "c", "a"]);
  const other = fixture();
  other.selection.select(["c"]);
  expect(other.events.commit).not.toHaveBeenCalled();
  expect(() => fixture({ selectionMode: "multiple", commitMode: "immediate" })).toThrow("explicit");
});

it("retains selected label metadata across remote filtering without selecting search results", async () => {
  const { props, selection } = fixture({ defaultValue: ["a"] });
  props.items = [{ value: "b", label: "Beta" }]; await nextTick();
  expect(selection.summary.value).toBe("Alpha");
  expect(selection.draft.value).toEqual(["a"]);
  selection.query.input("beta");
  expect(selection.draft.value).toEqual(["a"]);
});
