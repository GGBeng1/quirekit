import { describe, expect, it } from "vitest";
import {
  createEditor,
  ResizableNodeView,
  ResizableNodeview
} from "../index";

describe("insertDefaultBlock", () => {
  it("inserts the schema default block with content and updates selection", () => {
    const editor = createEditor({
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "first" }]
        }]
      }
    });
    const position = editor.state.doc.content.size;

    expect(editor.commands.insertDefaultBlock({
      pos: position,
      content: { type: "text", text: "second" }
    })).toBe(true);

    expect(editor.state.doc.childCount).toBe(2);
    expect(editor.state.doc.child(1).textContent).toBe("second");
    expect(editor.state.pm.selection.from).toBeGreaterThan(position);
  });

  it("keeps the historical Tiptap class spelling as the same constructor", () => {
    expect(ResizableNodeview).toBe(ResizableNodeView);
  });
});
