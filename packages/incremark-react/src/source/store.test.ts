import { afterEach, expect, it, vi } from "vitest";
import { MarkdownSourceStore } from "./store";
import { MarkdownStream } from "@quirekit/incremark-core";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("keeps snapshots stable and accepts a CRLF across commit boundaries", () => {
  const store = new MarkdownSourceStore({ content: "# title\r", identity: "one" });
  const initial = store.getSnapshot();
  store.update({ content: "# title\r", identity: "one" });
  expect(store.getSnapshot()).toBe(initial);
  store.update({ content: "# title\r\n\n🙂", identity: "one" });
  expect(store.getSnapshot().state?.doc.toString()).toBe("# title\n\n🙂");
  expect(store.getSnapshot().generation).toBe(initial.generation);
  store.update({ content: "# title\r\n\n🙂", identity: "two" });
  expect(store.getSnapshot().generation).toBe(initial.generation + 1);
});

it("constructs deferred SSR without a timer and cancels on the last unsubscribe", () => {
  vi.useFakeTimers();
  vi.spyOn(MarkdownStream.prototype, "advance").mockReturnValue(false);
  vi.spyOn(MarkdownStream.prototype, "pending", "get").mockReturnValue(true);
  const store = new MarkdownSourceStore({ content: "text", ssr: "source" });
  expect(store.getServerSnapshot().state).toBeUndefined();
  expect(vi.getTimerCount()).toBe(0);
  store.update({ content: "text", ssr: "source" });
  expect(store.getSnapshot().state?.doc.toString()).toBe("text");
  const unsubscribe = store.subscribe(() => {});
  expect(vi.getTimerCount()).toBe(1); unsubscribe();
  expect(vi.getTimerCount()).toBe(0);
  const reconnect = store.subscribe(() => {}); expect(vi.getTimerCount()).toBe(1);
  reconnect(); expect(vi.getTimerCount()).toBe(0);
});
