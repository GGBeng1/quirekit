// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { createBlockEditor } from "../runtime/create";
import { importBlockBackup } from "../ui/files/document";

/** @param text - Editable body. @returns Isolated product without heavy object renderers. */
function create(text = "保留正文") {
  return createBlockEditor({ preset: { image: false, dataView: false, textDiagram: false, mindMap: false, flowchart: false, whiteboard: false },
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text, marks: [{ type: "bold" }] }] }] } });
}
describe("Block structured containers", () => {
  it("rejects malformed container attributes before importing any content", () => {
    const { editor, destroy } = create();
    const original = editor.state.doc;
    const content = { type: "doc", content: [{ type: "blockContainer", attrs: { kind: "unrecognized" }, content: [{ type: "paragraph" }] }] };
    expect(() => importBlockBackup(editor, JSON.stringify(content))).toThrow("Invalid container kind");
    expect(editor.state.doc).toBe(original);
    expect(editor.can().undo()).toBe(false);
    destroy();
  });
  it("wraps actual paragraphs, changes presentation and unwraps through independent undo steps", () => {
    const { editor, destroy } = create();
    editor.commands.setTextSelection({ from: 1, to: 5 });
    expect(editor.commands.setBlockContainer({ kind: "highlight", color: "purple", emoji: "📌" })).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("blockContainer");
    const node = editor.state.doc.firstChild!;
    expect(node.firstChild?.firstChild?.marks[0]?.type.name).toBe("bold");
    expect(editor.commands.updateBlockContainer({ position: 0, expected: node, attrs: { color: "green", textColor: "green", emoji: "💡" } })).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.color).toBe("green");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.firstChild?.attrs.color).toBe("purple");
    expect(editor.commands.unwrapBlockContainer(0)).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.textContent).toBe("保留正文");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("blockContainer");
    destroy();
  });
  it("round trips nested typed containers through JSON and HTML without including control text", () => {
    const { editor, destroy } = create();
    editor.commands.setContent({ type: "doc", content: [{ type: "blockContainer", attrs: { kind: "details", title: "更多信息" }, content: [
      { type: "blockContainer", attrs: { kind: "warning", title: "发布前检查" }, content: [{ type: "paragraph", content: [{ type: "text", text: "确认回滚" }] }] },
      { type: "paragraph", content: [{ type: "text", text: "后续补充" }] }
    ] }] });
    const json = editor.getJSON(), html = editor.getHTML();
    editor.commands.setContent(json);
    expect(editor.getJSON()).toEqual(json);
    expect(html).toContain("发布前检查");
    expect(html).toContain("data-qk-block-container");
    editor.commands.setContent(html);
    // Paste/import intentionally allocates fresh block identities, as for ordinary paragraphs.
    const semantic = (value: unknown) => JSON.parse(JSON.stringify(value, (key, item) => key === "blockId" ? undefined : item));
    expect(semantic(editor.getJSON())).toEqual(semantic(json));
    destroy();
  });
  it("rejects stale targets, unsupported fields and readonly changes without losing children", () => {
    const { editor, destroy } = create();
    editor.commands.setTextSelection(1);
    editor.commands.setBlockContainer({ kind: "note", title: "说明" });
    const original = editor.state.doc.firstChild!;
    expect(editor.commands.updateBlockContainer({ position: 0, expected: original, attrs: { color: "unknown" as "blue" } })).toBe(false);
    editor.commands.insertContent("新增");
    expect(editor.commands.updateBlockContainer({ position: 0, expected: original, attrs: { title: "过期" } })).toBe(false);
    editor.setEditable(false);
    const before = editor.state.doc;
    expect(editor.commands.unwrapBlockContainer(0)).toBe(false);
    expect(editor.commands.setBlockContainer({ kind: "highlight" })).toBe(false);
    expect(editor.state.doc).toBe(before);
    destroy();
  });
});
