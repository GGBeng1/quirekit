import { expect, it } from "vitest";
import { EditorSelection, EditorState } from "@quirekit/cm-state";
import { Decoration } from "@quirekit/cm-view";
import { markdown } from "@quirekit/cm-lang-markdown";
import { modeFacet } from "../../state/fields";
import { sourceRevealSetting } from "../../presentation/visibility";
import { editingObjectBoundaries } from "./objects";
import { editingBoundaries } from "./runtime";

/** @returns A rendered component over syntax that would otherwise expose a literal body. */
function fixture() {
  return EditorState.create({ doc: "before\n\n```json\nprivate-data\n```\n\nafter", extensions: [markdown(), modeFacet.of("live"),
    sourceRevealSetting.extension(() => "hidden"), editingObjectBoundaries(state => {
      const text = state.doc.toString(), from = text.indexOf("```json"), to = text.indexOf("```", from + 3) + 3;
      return from >= 0 && to > from ? Decoration.set([Decoration.replace({ block: true }).range(from, to)]) : Decoration.none;
    }),
    editingBoundaries([{ nodes: ["FencedCode"], resolve: ({ node }) => ({ from: node.from, to: node.to, contentFrom: node.from + 8, contentTo: node.to - 4, kind: "block" }) }])] });
}

it("keeps projected component data opaque to cursor placement and partial replacement", () => {
  const state = fixture();
  expect(state.update({ selection: { anchor: 19 } }).state.selection.main.head).toBe(32);
  const selected = state.update({ selection: EditorSelection.single(2, 20), filter: false }).state;
  const edited = selected.update({ ...selected.replaceSelection("X"), userEvent: "input.paste" }).state;
  expect(edited.doc.toString()).toContain("private-data");
});

it("selects the whole object on a collapsed delete and removes it only on the next delete", () => {
  const state = fixture().update({ selection: { anchor: 32 } }).state;
  const first = state.update({ changes: { from: 8, to: 32 }, userEvent: "delete.backward" }).state;
  expect(first.doc).toBe(state.doc);
  expect([first.selection.main.from, first.selection.main.to]).toEqual([8, 32]);
  const second = first.update({ ...first.replaceSelection(""), userEvent: "delete.selection" }).state;
  expect(second.doc.toString()).toBe("before\n\n\n\nafter");
});
