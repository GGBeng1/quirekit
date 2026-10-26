import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import type { ActivityEvent, ActivityTarget } from "@quirekit/edit-history";
import type { MdCommentsBridge } from "../comments/types";
import { locateActivity } from "./locate";

/** @param target - Recorded anchor. @returns Minimal confirmed event carrying it. */
const event = (target?: ActivityTarget) => ({ id: "e1", target }) as unknown as ActivityEvent;
/** @param doc - Recorded source. @param quote - Unique recorded text. @returns Local source-range anchor for it. */
function sourceTarget(doc: string, quote: string): ActivityTarget {
  const from = doc.indexOf(quote);
  return { scheme: "source-range", value: { from, to: from + quote.length }, quote };
}

describe("locateActivity", () => {
  const recorded = "# 标题\n\n第一段内容。第二句话。\n\n结尾段落。\n";
  const target = sourceTarget(recorded, "第二句话");

  it("is exact while the recorded text is still in place", () => {
    expect(locateActivity(EditorState.create({ doc: recorded }), event(target))).toEqual({ status: "exact", range: target.value });
  });

  it("follows the same text after a paragraph split or merge, and reports deletion", () => {
    const split = recorded.replace("第一段内容。", "第一段\n\n内容。");
    expect(locateActivity(EditorState.create({ doc: split }), event(target))).toEqual({ status: "approximate", range: { from: split.indexOf("第二句话"), to: split.indexOf("第二句话") + 4 } });
    const merged = recorded.replace("。\n\n结尾", "。结尾").replace("# 标题\n\n", "");
    expect(locateActivity(EditorState.create({ doc: merged }), event(target))).toMatchObject({ status: "approximate", range: { from: merged.indexOf("第二句话") } });
    expect(locateActivity(EditorState.create({ doc: recorded.replace("第二句话。", "") }), event(target))).toEqual({ status: "deleted" });
  });

  it("never guesses between repeated text and rejects unknown anchors", () => {
    const repeated = "第二句话\n\n" + recorded;
    expect(locateActivity(EditorState.create({ doc: repeated }), event(target))).toEqual({ status: "unavailable" });
    expect(locateActivity(EditorState.create({ doc: recorded }), event())).toEqual({ status: "unavailable" });
    expect(locateActivity(EditorState.create({ doc: recorded }), event({ scheme: "elsewhere", value: 1 }))).toEqual({ status: "unavailable" });
  });

  it("checks resolver ranges against the quote and treats collapsed anchors as deleted", () => {
    const state = EditorState.create({ doc: recorded }), from = recorded.indexOf("第二句话");
    const anchor = event({ scheme: "yjs-relative", value: {}, quote: "第二句话" });
    expect(locateActivity(state, anchor, () => ({ from, to: from + 4 }))).toEqual({ status: "exact", range: { from, to: from + 4 } });
    expect(locateActivity(state, anchor, () => ({ from: from - 1, to: from + 4 }))).toMatchObject({ status: "approximate" });
    expect(locateActivity(state, anchor, () => ({ from, to: from }))).toEqual({ status: "deleted" });
    expect(locateActivity(state, anchor, () => ({ from, to: recorded.length + 1 }))).toEqual({ status: "unavailable" });
    expect(locateActivity(state, anchor, () => null)).toEqual({ status: "unavailable" });
  });

  it("locates comment threads through the installed comment bridge", () => {
    const thread: ActivityTarget = { scheme: "comment-thread", value: { threadId: "id-1" } }, state = EditorState.create({ doc: recorded });
    const bridge = { locate: (_state: EditorState, id: string) => id === "id-1" ? { status: "exact", range: { from: 1, to: 2 } } : { status: "deleted" } } as unknown as MdCommentsBridge;
    expect(locateActivity(state, event(thread), undefined, bridge)).toEqual({ status: "exact", range: { from: 1, to: 2 } });
    expect(locateActivity(state, event({ scheme: "comment-thread", value: { threadId: "gone" } }), undefined, bridge)).toEqual({ status: "deleted" });
    expect(locateActivity(state, event(thread))).toEqual({ status: "unavailable" });
  });
});
