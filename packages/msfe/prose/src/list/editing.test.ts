import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { markdown } from "@quirekit/cm-lang-markdown";
import { GFM } from "@quirekit/lezer-markdown";
import { changeListIndent, continueList } from "./commands";

/** @param doc - Markdown source. @param text - Caret landmark. @returns Canonical state with installed Markdown. */
function state(doc: string, text: string): EditorState {
  return EditorState.create({ doc, selection: { anchor: doc.indexOf(text) + text.length }, extensions: markdown({ extensions: GFM }) });
}
describe("list structural commands", () => {
  it("moves a whole item including descendants and preserves task state", () => {
    const doc = "- first\n- [x] second\n  - child\n- last";
    const before = state(doc, "second");
    const nested = before.update(changeListIndent(1)(before)!).state;
    expect(nested.doc.toString()).toBe("- first\n  - [x] second\n    - child\n- last");
    expect(nested.update(changeListIndent(-1)(nested)!).state.doc.toString()).toBe(doc);
  });
  it("uses the previous ordered marker width and preserves a backward multi-item selection", () => {
    const doc = "> 10. first\n> 11. second\n> 12. third";
    let before = state(doc, "second");
    before = before.update({ selection: EditorSelection.range(doc.length, doc.indexOf("second")) }).state;
    const spec = changeListIndent(1)(before)!;
    expect(spec).not.toBeNull();
    const after = before.update(spec).state;
    expect(after.doc.toString()).toBe("> 10. first\n>     11. second\n>     12. third");
    expect(after.selection.main.anchor).toBeGreaterThan(after.selection.main.head);
  });
  it("refuses first-item indentation and can unwrap a root task without losing its body", () => {
    expect(changeListIndent(1)(state("- first", "first"))).toBeNull();
    const before = state("- [x] done", "done");
    expect(before.update(changeListIndent(-1)(before)!).state.doc.toString()).toBe("done");
  });
  it("continues task items with unchecked markers and exposes CM empty-item exit", () => {
    const before = state("- [x] done", "done");
    const after = before.update(continueList()(before)!).state;
    expect(after.doc.toString()).toBe("- [x] done\n- [ ] ");
    const empty = state("- ", "- ");
    expect(empty.update(continueList()(empty)!).state.doc.toString()).toBe("");
    expect(continueList()(state("ordinary", "ordinary"))).toBeNull();
  });
  it("keeps enclosing quotes when unwrapping and refuses shared opening lines", () => {
    const source = "- outer\n  > - child\n  >   continuation";
    const before = state(source, "child");
    expect(before.update(changeListIndent(-1)(before)!).state.doc.toString()).toBe("- outer\n  > child\n  > continuation");
    expect(changeListIndent(-1)(state("- - shared", "shared"))).toBeNull();
    const empty = state("-", "-");
    expect(empty.update(changeListIndent(-1)(empty)!).state.doc.toString()).toBe("");
  });
});
