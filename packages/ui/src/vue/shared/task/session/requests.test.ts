import { watch } from "vue";
import { describe, expect, it } from "vitest";
import type { QuireKitTaskRequestContext } from "../../../../components/task/types";
import { createTaskRequests } from "./requests";

/** @returns An explicitly settled host operation without timers or network. */
function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

describe("task request channels", () => {
  it("starts closed and allocates distinct sessions with independent monotonic request ids", () => {
    const task = createTaskRequests("picker");
    expect(task.sessionId.value).toBeNull();
    expect(task.submitting.value).toBe(false);
    expect(task.startSubmission()).toBeNull();
    expect(task.startSearch()).toBeNull();
    const first = task.begin();
    const submit = task.startSubmission()!;
    const search = task.startSearch()!;
    expect([submit.sessionId, search.sessionId]).toEqual([first, first]);
    expect([submit.requestId, search.requestId]).toEqual([1, 1]);
    expect(task.startSubmission()).toBeNull();
    const secondSearch = task.startSearch()!;
    expect(secondSearch.requestId).toBe(2);
    const second = task.begin();
    expect(second).not.toBe(first);
    expect(task.sessionId.value).toBe(second);
    expect(submit.signal.aborted && secondSearch.signal.aborted).toBe(true);
    expect(task.startSubmission()!.requestId).toBe(2);
    expect(task.startSearch()!.requestId).toBe(3);
  });

  it("accepts spread business fields but rejects other signals, channels and finished work", () => {
    const task = createTaskRequests("picker"); task.begin();
    const submit = task.startSubmission()!;
    const business = { ...submit, value: ["draft"] };
    expect(task.isCurrent(business, "submission")).toBe(true);
    expect(task.isCurrent(business, "search")).toBe(false);
    expect(task.isCurrent({ ...submit, signal: new AbortController().signal }, "submission")).toBe(false);
    expect(task.isCurrent({ ...submit, requestId: submit.requestId + 1 }, "submission")).toBe(false);
    task.finishSubmission(business);
    expect(task.submitting.value).toBe(false);
    expect(task.isCurrent(submit, "submission")).toBe(false);
    expect(submit.signal.aborted).toBe(false);
    const retry = task.startSubmission()!;
    task.finishSubmission(submit);
    expect(task.isCurrent(retry, "submission")).toBe(true);
  });

  it.each(["resolve", "reject"] as const)("isolates late %s without unlocking a replacement session", async outcome => {
    const task = createTaskRequests("picker"); const operation = deferred(); const effects: string[] = [];
    task.begin(); const old = task.startSubmission()!;
    const completion = operation.promise.then(() => {
      if (task.isCurrent(old, "submission")) effects.push("success");
    }, () => {
      if (task.isCurrent(old, "submission")) effects.push("error");
    }).finally(() => task.finishSubmission(old));
    task.end(); task.begin(); const replacement = task.startSubmission()!;
    if (outcome === "resolve") operation.resolve(); else operation.reject(new Error("host failure"));
    await completion;
    expect(old.signal.aborted).toBe(true);
    expect(effects).toEqual([]);
    expect(task.isCurrent(replacement, "submission")).toBe(true);
    expect(task.submitting.value).toBe(true);
  });

  it("keeps submission and search cancellation independent", () => {
    const task = createTaskRequests("picker"); task.begin();
    const submit = task.startSubmission()!; const first = task.startSearch()!;
    const observations: boolean[] = [];
    first.signal.addEventListener("abort", () => {
      observations.push(!task.isCurrent(first, "search"), task.isCurrent(submit, "submission"));
    });
    const next = task.startSearch()!;
    expect(observations).toEqual([true, true]);
    expect(first.signal.aborted).toBe(true);
    expect(submit.signal.aborted).toBe(false);
    task.cancelSubmission();
    expect(submit.signal.aborted).toBe(true);
    expect(task.submitting.value).toBe(false);
    expect(task.isCurrent(next, "search")).toBe(true);
  });

  it("invalidates both references and the session before end abort listeners run", () => {
    const task = createTaskRequests("picker"); task.begin();
    const submit = task.startSubmission()!; const search = task.startSearch()!;
    const observed: boolean[] = [];
    for (const request of [submit, search]) request.signal.addEventListener("abort", () => {
      observed.push(task.sessionId.value === null && !task.submitting.value);
      observed.push(!task.isCurrent(submit, "submission") && !task.isCurrent(search, "search"));
      observed.push(task.startSubmission() === null && task.startSearch() === null);
    });
    task.end(); task.end();
    expect(observed).toEqual([true, true, true, true, true, true]);
    expect(submit.signal.aborted && search.signal.aborted).toBe(true);
  });

  it("allows a replacement submission to start synchronously from the old abort listener", () => {
    const task = createTaskRequests("picker"); task.begin();
    const old = task.startSubmission()!;
    let replacement: QuireKitTaskRequestContext | null = null;
    old.signal.addEventListener("abort", () => { replacement = task.startSubmission(); });
    task.cancelSubmission();
    expect(replacement).not.toBeNull();
    expect(task.isCurrent(replacement!, "submission")).toBe(true);
  });

  it.each(["end", "begin"] as const)("abandons search replacement when abort calls %s", action => {
    const task = createTaskRequests("picker"); const firstSession = task.begin();
    const old = task.startSearch()!;
    old.signal.addEventListener("abort", () => { task[action](); });
    expect(task.startSearch()).toBeNull();
    expect(task.sessionId.value).not.toBe(firstSession);
    expect(task.isCurrent(old, "search")).toBe(false);
  });

  it("preserves a newer reentrant query and honours cancellation of pending replacement", () => {
    const task = createTaskRequests("picker"); task.begin();
    const first = task.startSearch()!;
    let inner: QuireKitTaskRequestContext | null = null;
    first.signal.addEventListener("abort", () => { inner = task.startSearch(); });
    expect(task.startSearch()).toBeNull();
    expect(inner).not.toBeNull();
    expect(task.isCurrent(inner!, "search")).toBe(true);
    inner!.signal.addEventListener("abort", () => task.cancelSearch());
    expect(task.startSearch()).toBeNull();
    expect(task.isCurrent(inner!, "search")).toBe(false);
  });

  it("allows search replacement when abort only starts work in the other channel", () => {
    const task = createTaskRequests("picker"); task.begin();
    const first = task.startSearch()!;
    let submit: QuireKitTaskRequestContext | null = null;
    first.signal.addEventListener("abort", () => { submit = task.startSubmission(); });
    const search = task.startSearch()!;
    expect(search).not.toBeNull();
    expect(task.isCurrent(search, "search")).toBe(true);
    expect(task.isCurrent(submit!, "submission")).toBe(true);
  });

  it("does not overwrite a new session started reentrantly during begin", () => {
    const task = createTaskRequests("picker"); task.begin();
    const old = task.startSubmission()!;
    let latest: string | null = null; let request: QuireKitTaskRequestContext | null = null;
    old.signal.addEventListener("abort", () => { latest = task.begin(); request = task.startSubmission(); });
    const superseded = task.begin();
    expect(superseded).not.toBe(latest);
    expect(task.sessionId.value).toBe(latest);
    expect(task.isCurrent(request!, "submission")).toBe(true);
  });

  it("ends captured requests without cancelling work opened by an abort listener", () => {
    const task = createTaskRequests("picker"); task.begin();
    const oldSubmit = task.startSubmission()!; const oldSearch = task.startSearch()!;
    let replacement: QuireKitTaskRequestContext | null = null;
    oldSubmit.signal.addEventListener("abort", () => { task.begin(); replacement = task.startSearch(); });
    task.end();
    expect(oldSearch.signal.aborted).toBe(true);
    expect(task.isCurrent(replacement!, "search")).toBe(true);
    expect(replacement!.signal.aborted).toBe(false);
  });

  it("returns no runnable submission when a synchronous owner closes during locking", () => {
    const task = createTaskRequests("picker"); task.begin();
    const stop = watch(task.submitting, active => { if (active) task.end(); }, { flush: "sync" });
    expect(task.startSubmission()).toBeNull();
    expect(task.sessionId.value).toBeNull();
    expect(task.submitting.value).toBe(false);
    stop();
  });
});
