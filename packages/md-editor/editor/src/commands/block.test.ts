import { describe, expect, it } from "vitest";
import { EditorState, EditorSelection } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { ensureSyntaxTree } from "@quirekit/cm-language";
import { GFM } from "@quirekit/lezer-markdown";
import { CustomContainer } from "@quirekit/msfe-markdown-extras";
import { sourceBlockAt, sourceBlockScopes, sourceBlockSibling, moveSourceBlock, removeSourceBlock, insertSourceBlock } from "@quirekit/msfe-core";
import { containerBlockScope } from "../presentation/activation/scope";
import { convertMdBlock } from "./block";
const syntax = CustomContainer.resolve(() => { throw new Error("Grammar only"); }).syntax!;
/** @param doc - Exact canonical Markdown. @returns Native state with container grammar and the product child-flow contract. */
function fixture(doc: string): EditorState {
  const state = EditorState.create({ doc, extensions: [markdown({ extensions: [GFM, syntax] }), sourceBlockScopes.of(containerBlockScope)] });
  // Block queries intentionally reject incomplete syntax. Establish that
  // precondition independently of the editor's short initial parse budget.
  expect(ensureSyntaxTree(state, state.doc.length, 1000)).not.toBeNull();
  return state.update({}).state;
}
describe("product block operations", () => {
  it("distinguishes container titles from child blocks and preserves exact nested source on moves", () => {
    const doc = "outside\n\n:::: note Title\nalpha **bold**\n\nbeta\n\n::: tip Nested\nbody\n:::\n::::\n\ntail", state = fixture(doc);
    const title = sourceBlockAt(state, doc.indexOf("Title"))!, first = sourceBlockAt(state, doc.indexOf("alpha"))!, second = sourceBlockSibling(state, first, 1)!;
    expect(title.name).toBe("CustomContainer");
    expect(first.name).toBe("Paragraph");
    expect(sourceBlockAt(state, first.to)).toEqual(first);
    expect(second.name).toBe("Paragraph");
    expect(moveSourceBlock(first, title, "before")(state)).toBeNull();
    expect(moveSourceBlock(first, sourceBlockAt(state, 1)!, "after")(state)).toBeNull();
    const moved = state.update(moveSourceBlock(first, second, "after")(state)!).state;
    expect(moved.doc.toString()).toBe(doc.replace("alpha **bold**\n\nbeta", "beta\n\nalpha **bold**"));
    expect(state.update(removeSourceBlock(first)(state)!).state.doc.toString()).toBe(doc.replace("alpha **bold**\n\n", ""));
    expect(state.update(insertSourceBlock(second, "after", "third")(state)!).state.doc.toString()).toBe(doc.replace("beta\n", "beta\n\nthird\n"));
  });
  it("moves complete containers and tables as indivisible blocks", () => {
    const doc = "::: note A\nbody\n:::\n\n| a | b |\n| --- | --- |\n| c | d |\n\ntail", state = fixture(doc);
    const container = sourceBlockAt(state, 5)!, table = sourceBlockAt(state, doc.indexOf("| c"))!;
    expect(table.name).toBe("Table");
    const result = state.update(moveSourceBlock(container, table, "after")(state)!).state.doc.toString();
    expect(result).toBe("| a | b |\n| --- | --- |\n| c | d |\n\n::: note A\nbody\n:::\n\ntail");
  });
  it("uses captured block scope for format conversion and retains inline Markdown", () => {
    const state = fixture("lead\n\n## A **title**\n\ntail"), block = sourceBlockAt(state, 12)!;
    expect(state.update(convertMdBlock(block, "task")(state)!).state.doc.toString()).toBe("lead\n\n- [ ] A **title**\n\ntail");
    const list = fixture("- first\n  - nested\n- second");
    const chosen = sourceBlockAt(list, 5)!;
    const selected = list.update({ selection: EditorSelection.single(chosen.from, chosen.to) }).state;
    expect(selected.update(convertMdBlock(chosen, "ordered")(selected)!).state.doc.toString()).toBe("1. first\n   1. nested\n2. second");
  });
  it("does not offer partial fences or convert complex blocks by stripping source", () => {
    const state = fixture("```ts\nunfinished");
    expect(sourceBlockAt(state, 8)).toBeNull();
    expect(sourceBlockAt(fixture("::: note\nunclosed"), 5)).toBeNull();
    expect(sourceBlockAt(fixture("::: note\nunclosed"), 12)).toBeNull();
    const complete = fixture("```ts\nconst x = 1\n```"), block = sourceBlockAt(complete, 8)!;
    expect(convertMdBlock(block, "paragraph")(complete)).toBeNull();
  });
  it("rejects insertions that terminate a container while retaining safe nested fences", () => {
    const state = fixture("::: note Outer\nfirst\n\nsecond\n:::\n\ntail"), child = sourceBlockAt(state, 16)!;
    const second = sourceBlockSibling(state, child, 1)!;
    expect(state.update(moveSourceBlock(child, second, "after")(state)!).state.doc.toString()).toBe("::: note Outer\nsecond\n\nfirst\n:::\n\ntail");
    expect(insertSourceBlock(child, "after", "::: warning Inner\nbody\n:::")(state)).toBeNull();
    const wider = fixture(":::: note Outer\nfirst\n::::\n\ntail"), nested = sourceBlockAt(wider, 18)!;
    expect(insertSourceBlock(nested, "after", "::: warning Inner\nbody\n:::")(wider)).not.toBeNull();
  });
});
