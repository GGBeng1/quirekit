import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { createDocumentState } from "../mount/state";
import { canInsertSourceBlock, insertSourceBlockAtSelection, querySourceBlockInsertion } from "./selection";

/** @param doc - Canonical source. @param from - Selection start. @param to - Selection end. @returns Accepted selection over a parsed document. */
function selected(doc: string, from: number, to = from): EditorState {
  return createDocumentState(doc, []).update({ selection: EditorSelection.single(from, to) }).state;
}

describe("source insertion explanations", () => {
  it.each([
    ["| a | b |\n| --- | --- |\n| one | two |", "one", "table"],
    ["```ts\none\n```", "one", "code"],
    ["```ts\none", "one", "structure"],
    ["- one\n- two", "one", "list"],
    ["> one", "one", "quote"],
    ["text **one** end", "one", "inline"],
  ])("explains a rejected insertion without changing its admission: %s", (doc, text, reason) => {
    const state = selected(doc!, doc!.indexOf(text!) + 1);
    expect(querySourceBlockInsertion(state)).toEqual({ range: null, reason });
    expect(canInsertSourceBlock(state)).toBe(false);
    expect(insertSourceBlockAtSelection("***")(state)).toBeNull();
    expect(state.doc.toString()).toBe(doc);
  });
  it("distinguishes a cross-block selection from a read-only document", () => {
    const state = selected("first\n\nsecond", 2, 10);
    expect(querySourceBlockInsertion(state).reason).toBe("selection");
    const readonly = EditorState.create({ doc: "text", extensions: [EditorState.readOnly.of(true)] });
    expect(querySourceBlockInsertion(readonly).reason).toBe("readonly");
  });
  it("admits a paragraph, a blank line and a complete selected block", () => {
    for (const state of [selected("body", 2), selected("body\n\n", 6), selected("```\ncode\n```", 0, 12)]) {
      expect(querySourceBlockInsertion(state).reason).toBeNull();
      expect(canInsertSourceBlock(state)).toBe(true);
      expect(insertSourceBlockAtSelection("***")(state)).not.toBeNull();
    }
  });
});
