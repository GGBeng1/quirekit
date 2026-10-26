// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { readWhiteboardDocument, type WhiteboardSceneRenderer } from "@quirekit/whiteboard";
import { MsfeWhiteboard } from "./extension";
import { applyMsfeWhiteboardDiagram } from "./diagram";

const editors: MsfeEditor[] = [];
const render: WhiteboardSceneRenderer = async scene => ({ scene, preview: { dataUrl: "data:image/png;base64,AAAA", width: 1, height: 1 } });
/** @returns Mounted source owner with ordinary Markdown around the insertion. */
function fixture(): MsfeEditor {
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement("div")), markdown: "before\n\nafter", extensions: [MsfeWhiteboard] });
  editors.push(editor); return editor;
}
/** @param editor - Source owner. @returns Sole decoded whiteboard authority. */
function board(editor: MsfeEditor) {
  return readWhiteboardDocument(editor.querySource("whiteboard", { from: 0, to: editor.state.doc.length }).matches[0]?.attrs.board);
}
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });

describe("programmatic Markdown whiteboards", () => {
  it("inserts and updates the source fence, preserves ordinary Markdown and undoes one edit", async () => {
    const editor = fixture();
    expect(await applyMsfeWhiteboardDiagram(editor, { title: "流程", nodes: [{ id: "a", label: "开始" }, { id: "b", label: "结束" }], edges: [{ id: "ab", from: "a", to: "b" }] }, render)).toBe("saved");
    const original = board(editor), before = editor.getMarkdown();
    expect(original.scene.elements).toHaveLength(5);
    expect(await applyMsfeWhiteboardDiagram(editor, { nodes: [{ id: "b", label: "上线", x: 500 }] }, render, { id: original.id, revision: original.revision })).toBe("saved");
    expect(board(editor).scene.elements.find(element => element.id === "b:label")?.text).toBe("上线");
    editor.undo(); expect(editor.getMarkdown()).toBe(before); editor.redo();
    expect(editor.getMarkdown()).toContain("before"); expect(editor.getMarkdown()).toContain("after");
    expect(await applyMsfeWhiteboardDiagram(editor, { title: "stale" }, render, { id: original.id, revision: original.revision })).toBe("conflict");
  });

  it("does not overwrite a source replacement during asynchronous preparation", async () => {
    const editor = fixture();
    let release!: () => void;
    const pending = applyMsfeWhiteboardDiagram(editor, { nodes: [{ id: "a" }] }, async scene => {
      await new Promise<void>(resolve => { release = resolve; }); return render(scene);
    });
    editor.replaceDocument("new document", "replacement"); release();
    expect(await pending).toBe("missing"); expect(editor.getMarkdown()).toBe("new document");
    editor.setReadOnly(true);
    expect(await applyMsfeWhiteboardDiagram(editor, { nodes: [{ id: "b" }] }, render)).toBe("readonly");
  });
});
