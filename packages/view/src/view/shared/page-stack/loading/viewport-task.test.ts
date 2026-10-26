// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageStackViewportTask } from "./viewport-task";

describe("PageStackViewportTask", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for idle capacity and rejects callbacks cancelled by a new scroll", () => {
    let idle!: IdleRequestCallback;
    const run = vi.fn().mockReturnValue(true);
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => { idle = callback; return 1; });
    const cancel = vi.fn();
    vi.stubGlobal("cancelIdleCallback", cancel);
    const task = new PageStackViewportTask(window, run);
    task.request();
    vi.runAllTimers();
    expect(run.mock.calls).toEqual([[false]]);
    idle({ didTimeout: false, timeRemaining: () => 1 });
    vi.runAllTimers();
    expect(run).toHaveBeenCalledTimes(1);
    const stale = idle;
    task.request();
    expect(cancel).toHaveBeenCalledWith(1);
    stale({ didTimeout: false, timeRemaining: () => 20 });
    expect(run).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    run.mockReturnValue(false);
    idle({ didTimeout: false, timeRemaining: () => 20 });
    expect(run.mock.calls).toEqual([[false], [false], [true]]);
    task.cancel();
  });

  it("yields between visible and neighbour work without requestIdleCallback", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    const run = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    const task = new PageStackViewportTask(window, run);
    task.request();
    vi.advanceTimersToNextFrame();
    vi.advanceTimersToNextFrame();
    vi.advanceTimersByTime(1);
    expect(run.mock.calls).toEqual([[false]]);
    vi.advanceTimersByTime(80);
    expect(run.mock.calls).toEqual([[false], [true]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule prefetch for a complete or zero-buffer window", () => {
    const run = vi.fn().mockReturnValue(false);
    const task = new PageStackViewportTask(window, run);
    task.request();
    vi.runAllTimers();
    expect(run.mock.calls).toEqual([[false]]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("retains synchronous full-window behavior without a browser scheduler", () => {
    const run = vi.fn().mockReturnValue(false);
    const task = new PageStackViewportTask(null, run);
    task.request();
    expect(run.mock.calls).toEqual([[]]);
  });
});
