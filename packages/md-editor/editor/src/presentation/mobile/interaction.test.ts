import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import type { EditorView } from "@quirekit/cm-view";
import { MobileSelectionInteraction, mobileDragRange } from "./interaction";

// These ownership tests isolate hit acceptance; rendered/atomic geometry has
// its own Core tests and actual mobile-browser boundary fixtures.
vi.mock("./geometry", () => ({ mobilePosition: (view: EditorView, point: { x: number; y: number }) => view.posAtCoords(point) }));

describe("native mobile selection ownership", () => {
  it("keeps the grabbed endpoint fixed through crossing and reversal", () => {
    const range = EditorSelection.range(4, 9);
    expect(mobileDragRange({ handle: "anchor", range }, 12)).toMatchObject({ anchor: 12, head: 9 });
    expect(mobileDragRange({ handle: "focus", range }, 1)).toMatchObject({ anchor: 4, head: 1 });
    expect(mobileDragRange({ handle: "caret", range }, 6)).toMatchObject({ anchor: 6, head: 6 });
  });

  it("does one selection transaction per changed hit, retains source and cancels stale gestures", () => {
    let state = EditorState.create({ doc: "one two three", selection: { anchor: 4 } }), enabled = true, writes = 0;
    const view = { get state() { return state; }, posAtCoords: () => 8,
      dispatch: (spec: Parameters<EditorState["update"]>[0]) => { writes++; state = state.update(spec).state; } } as unknown as EditorView;
    const interaction = new MobileSelectionInteraction(view, () => enabled);
    interaction.begin({ handle: "caret", pointerId: 1, pointerType: "touch", point: { x: 0, y: 0 }, pointer: { x: 0, y: 0 } });
    for (let index = 0; index < 20; index++) interaction.move({ x: index, y: 0 });
    expect(writes).toBe(1); expect(state.selection.main.head).toBe(8); expect(state.doc.toString()).toBe("one two three");
    enabled = false; interaction.hold({ x: 0, y: 0 }); expect(writes).toBe(1);
    enabled = true; interaction.cancel(); interaction.move({ x: 0, y: 0 }); expect(writes).toBe(1);
  });

  it("arms a held caret with no hit, word lookup or transaction and extends only after movement", () => {
    let state = EditorState.create({ doc: "one two three", selection: { anchor: 5 } }), enabled = true, writes = 0;
    const hit = vi.fn(() => 8), word = vi.spyOn(state, "wordAt");
    const view = { get state() { return state; }, posAtCoords: hit,
      dispatch: (spec: Parameters<EditorState["update"]>[0]) => { writes++; state = state.update(spec).state; } } as unknown as EditorView;
    const interaction = new MobileSelectionInteraction(view, () => enabled);
    interaction.begin({ handle: "caret", pointerId: 1, pointerType: "touch", point: { x: 0, y: 0 }, pointer: { x: 0, y: 0 } });
    interaction.holdCaret();
    expect(state.selection.main).toMatchObject({ anchor: 5, head: 5 });
    expect(hit).not.toHaveBeenCalled(); expect(word).not.toHaveBeenCalled(); expect(writes).toBe(0);
    for (let index = 0; index < 20; index++) interaction.move({ x: index, y: 0 });
    expect(state.selection.main).toMatchObject({ anchor: 5, head: 8 });
    expect(writes).toBe(1); expect(state.doc.toString()).toBe("one two three");
    interaction.cancel(); interaction.move({ x: 0, y: 0 }); expect(writes).toBe(1);
    enabled = false; interaction.holdCaret(); interaction.move({ x: 0, y: 0 }); expect(writes).toBe(1);
  });

  it("arms a body hold at its exact visible position and never preselects a word", () => {
    let state = EditorState.create({ doc: "one two three", selection: { anchor: 5 } });
    const view = { get state() { return state; }, posAtCoords: () => 5,
      dispatch: (spec: Parameters<EditorState["update"]>[0]) => { state = state.update(spec).state; } } as unknown as EditorView;
    const interaction = new MobileSelectionInteraction(view, () => true);
    interaction.hold({ x: 0, y: 0 });
    expect(state.selection.main).toMatchObject({ anchor: 5, head: 5 });
    interaction.move({ x: 0, y: 0 });
    expect(state.selection.main.empty).toBe(true);
    expect(state.doc.toString()).toBe("one two three");
  });
});
