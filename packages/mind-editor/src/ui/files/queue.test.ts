import { describe, expect, it } from "vitest";
import { createMindEditorPreviewQueue } from "./queue";

describe("preview queue ownership", () => {
  it("finishes active cleanup before selected detail and retains ordinary FIFO", async () => {
    const queue = createMindEditorPreviewQueue(), signal = new AbortController().signal, order: string[] = [];
    let release!: () => void, active = 0, maximum = 0;
    const gate = new Promise<void>(resolve => { release = resolve; });
    /** @param name - Recorded job. @param wait - Optional active rendering phase. @returns Recorded result after resource cleanup. */
    async function run(name: string, wait = Promise.resolve()): Promise<string> {
      active++; maximum = Math.max(maximum, active); order.push(name); await wait; active--; return name;
    }
    const first = queue.enqueue(() => run("active", gate), signal); await Promise.resolve();
    const one = queue.enqueue(() => run("card1"), signal), two = queue.enqueue(() => run("card2"), signal);
    const detail = queue.enqueue(() => run("detail"), signal, true);
    release(); expect(await Promise.all([first, one, two, detail])).toEqual(["active", "card1", "card2", "detail"]);
    expect(order).toEqual(["active", "detail", "card1", "card2"]); expect(maximum).toBe(1); queue.dispose();
  });
  it("removes aborted waiting cards and can still execute the next selection", async () => {
    const queue = createMindEditorPreviewQueue(), aborted = new AbortController(), ready = new AbortController(), order: string[] = [];
    const canceled = queue.enqueue(async () => { order.push("canceled"); }, aborted.signal);
    const rejected = expect(canceled).rejects.toMatchObject({ name: "AbortError" }); aborted.abort(); await rejected;
    await queue.enqueue(async () => { order.push("selected"); }, ready.signal, true);
    expect(order).toEqual(["selected"]); queue.dispose();
  });
  it("closing before the scheduled frame rejects queued and later work without running it", async () => {
    const queue = createMindEditorPreviewQueue(), signal = new AbortController().signal;
    let ran = false;
    const pending = queue.enqueue(async () => { ran = true; }, signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" }); queue.dispose(); await rejected;
    await expect(queue.enqueue(async () => { ran = true; }, signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(ran).toBe(false);
  });
});
