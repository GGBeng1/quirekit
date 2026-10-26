// @vitest-environment happy-dom
import { effectScope, reactive } from "vue";
import { expect, it, vi } from "vitest";
import { createTaskRequests } from "../session/requests";
import { useSelectionQuery } from "./query";

it("publishes one complete IME query, retains native text and aborts only superseded search", () => {
  const props = reactive({ items: [{ value: "a", label: "中文", keywords: ["zhong"] }], query: "" });
  const requests = createTaskRequests("query"); requests.begin();
  const events = { updateValue: vi.fn(), commit: vi.fn(), error: vi.fn(), updateQuery: vi.fn(value => { props.query = value; }), search: vi.fn(), success: vi.fn() };
  const scope = effectScope();
  const query = scope.run(() => useSelectionQuery({ props, requests, events }))!;
  query.compositionStart(); query.input("zhong");
  expect(query.query.value).toBe("zhong");
  expect(events.search).not.toHaveBeenCalled();
  query.input("incomplete");
  expect(query.visibleItems.value).toHaveLength(1);
  const input = document.createElement("input"); input.value = "中文";
  const event = new CompositionEvent("compositionend");
  Object.defineProperty(event, "target", { value: input });
  query.compositionEnd(event); query.input("中文");
  expect(events.updateQuery).toHaveBeenCalledExactlyOnceWith("中文");
  expect(events.search).toHaveBeenCalledOnce();
  const first = events.search.mock.calls[0]![0];
  expect(first.signal.aborted).toBe(false);
  query.input("下一条");
  expect(first.signal.aborted).toBe(true);
  expect(events.search).toHaveBeenCalledTimes(2);
  const second = events.search.mock.calls[1]![0];
  props.query = "宿主替换";
  expect(second.signal.aborted).toBe(true);
  requests.end(); scope.stop();
});
