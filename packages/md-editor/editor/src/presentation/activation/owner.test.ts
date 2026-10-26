import { describe, expect, it } from "vitest";
import { EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { GFM } from "@quirekit/lezer-markdown";
import { isSourceRevealed, sourceRevealResolver } from "@quirekit/msfe-core";
import { modeFacet } from "@quirekit/msfe-core/state";
import { CustomContainer } from "@quirekit/msfe-markdown-extras";
import { markdownRevealOwner } from "./owner";

const container = CustomContainer.resolve(() => { throw new Error("No editor in grammar fixtures"); }).syntax!;

/** @param doc - Exact source fixture. @param anchor - Actual caret. @returns State with the product's activation policy. */
function fixture(doc: string, anchor: number): EditorState {
  return EditorState.create({ doc, selection: { anchor }, extensions: [markdown({ extensions: [GFM, container] }),
    modeFacet.of("live"), sourceRevealResolver.of(markdownRevealOwner)] });
}

describe("semantic source activation", () => {
  it("activates a multi-line paragraph but not the following one", () => {
    const source = "first **bold**\nsecond *italic*\n\nlast **stable**", state = fixture(source, 1);
    expect(markdownRevealOwner(state, { from: 8, to: 12 })).toEqual({ from: 0, to: source.indexOf("\n\n") });
    expect(isSourceRevealed(state, { from: source.indexOf("italic"), to: source.indexOf("italic") + 6 })).toBe(true);
    expect(isSourceRevealed(state, { from: source.indexOf("stable"), to: source.indexOf("stable") + 6 })).toBe(false);
    expect(state.selection.main.head).toBe(1);
  });

  it("uses each nested item as an owner without activating its siblings", () => {
    const doc = "- parent **bold**\n  - child *first*\n  - sibling *second*\n- last **stable**";
    const state = fixture(doc, doc.indexOf("child"));
    for (const [text, active] of [["bold", true], ["first", true], ["second", false], ["stable", false]] as const) {
      const from = doc.indexOf(text);
      expect(isSourceRevealed(state, { from, to: from + text.length })).toBe(active);
    }
  });

  it("does not widen a cell, code body, or container paragraph to an outer list/container", () => {
    const doc = ":::: note outer\nfirst **bold**\n\nsecond *stable*\n\n| a | b |\n| --- | --- |\n| **left** | *right* |\n::::";
    for (const [anchor, target] of [["first", "stable"], ["left", "right"]]) {
      const state = fixture(doc, doc.indexOf(anchor!)), from = doc.indexOf(target!);
      expect(isSourceRevealed(state, { from, to: from + target!.length })).toBe(false);
    }
    const code = "- parent\n\n  ```text\n  code\n  ```", state = fixture(code, 3), from = code.indexOf("code");
    expect(markdownRevealOwner(state, { from, to: from + 4 })).toEqual({ from, to: from + 4 });
  });
});
