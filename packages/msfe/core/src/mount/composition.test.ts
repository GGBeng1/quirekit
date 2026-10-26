import { describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { Decoration, EditorView } from "@quirekit/cm-view";
import { prepareCompositionSelection } from "./composition";

/** @param state - Canonical source fixture. @returns A single native text node, excluding real DOM behavior covered by browser tests. */
function textView(state: EditorState): EditorView {
  const node = { nodeType: 3 };
  return { state, composing: false, contentDOM: {}, domAtPos: () => ({ node, offset: 0 }) } as unknown as EditorView;
}

describe("composition selection preparation", () => {
  for (const backward of [false, true]) it(`replaces the exact ${backward ? "backward" : "forward"} canonical range once`, () => {
    const state = EditorState.create({ doc: "left [label][ref] right", selection: { anchor: backward ? 17 : 5, head: backward ? 5 : 17 },
      extensions: EditorView.atomicRanges.of(() => Decoration.set([
        Decoration.replace({}).range(5, 6), Decoration.replace({}).range(11, 17),
      ])) });
    const view = textView(state);
    const transaction = state.update(prepareCompositionSelection(view)!);
    expect(transaction.newDoc.toString()).toBe("left  right");
    expect(transaction.newSelection.main).toMatchObject({ anchor: 5, head: 5 });
    expect(transaction.isUserEvent("input")).toBe(true);
    expect(prepareCompositionSelection({ ...view, state: transaction.state } as EditorView)).toBeUndefined();
  });

  it("leaves a selection touching only the outside of hidden markers to native input", () => {
    const state = EditorState.create({ doc: "**label**", selection: { anchor: 2, head: 7 },
      extensions: EditorView.atomicRanges.of(() => Decoration.set([
        Decoration.replace({}).range(0, 2), Decoration.replace({}).range(7, 9),
      ])) });
    expect(prepareCompositionSelection(textView(state))).toBeUndefined();
  });

  it("removes all selected ranges atomically and preserves the primary range", () => {
    const state = EditorState.create({ doc: "**one**\n\nplain", selection: EditorSelection.create([
      EditorSelection.range(0, 7), EditorSelection.range(14, 9),
    ], 1), extensions: [EditorState.allowMultipleSelections.of(true),
      EditorView.atomicRanges.of(() => Decoration.set([Decoration.replace({}).range(0, 2)]))] });
    const transaction = state.update(prepareCompositionSelection(textView(state))!);
    expect(transaction.newDoc.toString()).toBe("\n\n");
    expect(transaction.newSelection.mainIndex).toBe(1);
    expect(transaction.newSelection.ranges.map(range => range.head)).toEqual([0, 2]);
  });

  it("prepares a styled selection before temporary native wrappers can become composition parents", () => {
    const provider = vi.fn(() => Decoration.none);
    const state = EditorState.create({ doc: "before **selected** after", selection: { anchor: 7, head: 19 },
      extensions: EditorView.atomicRanges.of(provider) });
    const view = textView(state);
    const positions = vi.spyOn(view, "domAtPos").mockImplementation(() => ({ node: { nodeType: 3 } as Node, offset: 0 }));
    expect(state.update(prepareCompositionSelection(view)!).newDoc.toString()).toBe("before  after");
    expect(positions).toHaveBeenCalledTimes(2);
    expect(provider).not.toHaveBeenCalled();
  });

  for (const skip of ["empty", "readonly", "composing", "edit-context"] as const) it(`does no range work for ${skip}`, () => {
    const provider = vi.fn(() => Decoration.none);
    const state = EditorState.create({ doc: "text", selection: { anchor: 0, head: skip === "empty" ? 0 : 4 },
      extensions: [EditorState.readOnly.of(skip === "readonly"), EditorView.atomicRanges.of(provider)] });
    expect(prepareCompositionSelection({ state, composing: skip === "composing",
      contentDOM: skip === "edit-context" ? { editContext: {} } : {} } as EditorView)).toBeUndefined();
    expect(provider).not.toHaveBeenCalled();
  });
});
