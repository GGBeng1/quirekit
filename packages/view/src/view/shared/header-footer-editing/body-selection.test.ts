import { EditorState, Schema, TextSelection } from "@quirekit/pm";
import type { QuireEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createHeaderFooterBodySelectionMemory } from "./body-selection";

const schema = new Schema({
  nodes: { doc: { content: "paragraph+" }, paragraph: { content: "text*" }, text: {} }
});

describe("header/footer body selection memory", () => {
  it("restores the first remembered body selection after story switches", () => {
    const fixture = createEditor();
    fixture.select(3);
    fixture.memory.remember();
    fixture.select(10);
    fixture.memory.remember();

    fixture.memory.restore();
    expect(fixture.editor.state.pm.selection.head).toBe(3);
  });

  it("falls back to a valid position when the remembered one disappeared", () => {
    const fixture = createEditor();
    fixture.select(12);
    fixture.memory.remember();
    fixture.replace(schema.node("doc", null, [schema.node("paragraph", null, [schema.text("ab")])]));

    fixture.memory.restore();
    expect(fixture.editor.state.pm.selection.head).toBeLessThanOrEqual(3);
  });

  it("forgets the record when a pointer gesture places the caret", () => {
    const fixture = createEditor();
    fixture.select(3);
    fixture.memory.remember();
    fixture.memory.forget();
    fixture.select(8);

    fixture.memory.restore();
    expect(fixture.editor.state.pm.selection.head).toBe(8);
  });
});

/** @returns Minimal editor facade with a two-paragraph document. */
function createEditor() {
  let pm = EditorState.create({
    schema,
    doc: schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("hello")]),
      schema.node("paragraph", null, [schema.text("world")])
    ])
  });
  const editor = {
    get state() { return { pm }; },
    dispatchTransaction(tr: ReturnType<EditorState["tr"]["setMeta"]>) { pm = pm.apply(tr); }
  } as unknown as QuireEditor;
  return {
    editor,
    memory: createHeaderFooterBodySelectionMemory(editor),
    select(position: number): void {
      pm = pm.apply(pm.tr.setSelection(TextSelection.create(pm.doc, position)));
    },
    replace(doc: ReturnType<typeof schema.node>): void {
      pm = pm.apply(pm.tr.replaceWith(0, pm.doc.content.size, doc.content));
    }
  };
}
