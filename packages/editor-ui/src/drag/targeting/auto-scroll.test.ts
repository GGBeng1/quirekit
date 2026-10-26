import { describe, expect, it } from "vitest";
import { resolveEditorUIBlockDragAutoScrollDecision } from ".";

describe("headless block drag auto-scroll decision", () => {
  it("produces equivalent logical decisions from translated backend deltas", () => {
    const canvas = resolveEditorUIBlockDragAutoScrollDecision({
      deltaX: 0,
      deltaY: 20,
      writingDirection: "ltr"
    });
    const svg = resolveEditorUIBlockDragAutoScrollDecision({
      deltaX: 0,
      deltaY: 20,
      writingDirection: "ltr"
    });

    expect(canvas).toEqual({
      kind: "scroll",
      deltaX: 0,
      deltaY: 20,
      edges: ["block-end"]
    });
    expect(svg).toEqual(canvas);
  });

  it("maps horizontal physical edges to logical inline edges under RTL", () => {
    expect(resolveEditorUIBlockDragAutoScrollDecision({
      deltaX: -23,
      deltaY: 0,
      writingDirection: "rtl"
    })).toEqual({
      kind: "scroll",
      deltaX: -23,
      deltaY: 0,
      edges: ["inline-end"]
    });
  });

  it("stays idle without finite mounted movement", () => {
    expect(resolveEditorUIBlockDragAutoScrollDecision({
      deltaX: 0,
      deltaY: 0,
      writingDirection: "ltr"
    })).toEqual({ kind: "idle" });
    expect(resolveEditorUIBlockDragAutoScrollDecision({
      deltaX: Number.NaN,
      deltaY: Number.POSITIVE_INFINITY,
      writingDirection: "ltr"
    })).toEqual({ kind: "idle" });
  });
});
