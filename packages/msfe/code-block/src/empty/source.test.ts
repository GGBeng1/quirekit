import { describe, expect, it } from "vitest";
import { EditorState, Prec } from "@quirekit/cm-state";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { createMsfeReadState } from "@quirekit/msfe-core";
import { CodeBlock } from "../code-block";
import { materializeCodeLine } from "./source";

/** @param markdown - Closed code source. @returns Editable canonical parser without a DOM host. */
function fixture(markdown: string) {
  const state = createMsfeReadState({ markdown, extensions: [CodeBlock,
    { id: "editable-test", extensions: Prec.highest(EditorState.readOnly.of(false)) }] });
  expect(ensureSyntaxTree(state, state.doc.length, 5000)).not.toBeNull(); return state;
}

describe("empty code line creation", () => {
  it.each([
    ["```js\n```", 0, "```js\n\n```", 6],
    ["before\n\n~~~\n~~~", 8, "before\n\n~~~\n\n~~~", 12],
    ["> ```js\n> ```", 2, "> ```js\n> \n> ```", 10],
    ["- ```js\n  ```", 2, "- ```js\n  \n  ```", 10],
  ])("creates one real row while preserving nested source prefixes: %s", (source, from, expected, head) => {
    const state = fixture(source), spec = materializeCodeLine(from)(state);
    expect(spec).not.toBeNull();
    const next = state.update(spec!).state;
    expect(next.doc.toString()).toBe(expected); expect(next.selection.main.head).toBe(head);
    expect(materializeCodeLine(from)(next)).toBeNull();
  });

  it("rejects incomplete, nonempty, stale and read-only targets", () => {
    for (const source of ["```js", "```js\n\n```", "```js\ntext\n```", "ordinary text"]) expect(materializeCodeLine(0)(fixture(source))).toBeNull();
    expect(materializeCodeLine(1)(fixture("```\n```"))).toBeNull();
    expect(materializeCodeLine(0)(createMsfeReadState({ markdown: "```\n```", extensions: [CodeBlock] }))).toBeNull();
  });
});
