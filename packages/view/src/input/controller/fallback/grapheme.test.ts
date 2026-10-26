import { createEditor, type QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import { createQuireEditorInputController } from "../..";
import { resolveGraphemeDeleteRange } from "./grapheme";

/** @param text - Paragraph content. @returns Editor with native PM keymaps. */
function fixture(text: string): QuireEditor {
  return createEditor({ extensions: [StarterKit], content: {
    type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }]
  } });
}

describe("canvas grapheme deletion", () => {
  for (const cluster of ["🙂", "e\u0301", "👩🏽‍💻", "👨‍👩‍👧‍👦", "🇨🇳", "1️⃣", "क्ष"]) {
    for (const direction of ["backward", "forward"] as const) {
      for (const input of ["keydown", "beforeinput"] as const) {
        it(`deletes ${cluster} intact (${direction}, ${input})`, () => {
          const editor = fixture(`L${cluster}R`);
          try {
            const controller = createQuireEditorInputController({ editor });
            editor.commands.setTextSelection(direction === "backward" ? 2 + cluster.length : 2);
            const result = input === "beforeinput"
              ? controller.handleBeforeInput({ inputType: direction === "backward" ? "deleteContentBackward" : "deleteContentForward" })
              : controller.handleKeyDown({ key: direction === "backward" ? "Backspace" : "Delete" });
            expect(result).toEqual({ handled: true, docChanged: true });
            expect(editor.state.doc.textContent).toBe("LR");
            expect(editor.state.pm.selection.from).toBe(2);
          } finally { editor.destroy(); }
        });
      }
    }
  }

  it("deletes a cluster spanning different marks and preserves adjacent marks", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "paragraph", content: [
        { type: "text", text: "Le", marks: [{ type: "bold" }] },
        { type: "text", text: "\u0301R", marks: [{ type: "italic" }] }
      ] }
    ] } });
    try {
      editor.commands.setTextSelection(4);
      createQuireEditorInputController({ editor }).handleKeyDown({ key: "Backspace" });
      expect(editor.state.doc.textContent).toBe("LR");
      expect(editor.state.doc.firstChild!.firstChild!.marks[0]!.type.name).toBe("bold");
      expect(editor.state.doc.firstChild!.lastChild!.marks[0]!.type.name).toBe("italic");
    } finally { editor.destroy(); }
  });

  for (const key of ["Backspace", "Delete"]) {
    it(`widens an interior UTF-16 cursor to the complete cluster (${key})`, () => {
      const editor = fixture("L👩🏽‍💻R");
      try {
        editor.commands.setTextSelection(3);
        createQuireEditorInputController({ editor }).handleKeyDown({ key });
        expect(editor.state.doc.textContent).toBe("LR");
      } finally { editor.destroy(); }
    });

    it(`keeps surrogate pairs intact when Segmenter is unavailable (${key})`, () => {
      const editor = fixture("L🙂R");
      try {
        editor.commands.setTextSelection(3);
        vi.stubGlobal("Intl", {});
        createQuireEditorInputController({ editor }).handleKeyDown({ key });
        expect(editor.state.doc.textContent).toBe("LR");
      } finally { vi.unstubAllGlobals(); editor.destroy(); }
    });
  }

  it("keeps hard breaks as segmentation barriers and limits work to the current run", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "paragraph", content: [
        { type: "text", text: "unrelated" }, { type: "hardBreak" },
        { type: "text", text: "e\u0301" }
      ] },
      { type: "paragraph", content: [{ type: "text", text: "other paragraph".repeat(200) }] }
    ] } });
    const spy = vi.spyOn(Intl.Segmenter.prototype, "segment");
    try {
      const end = 1 + editor.state.doc.firstChild!.content.size;
      expect(resolveGraphemeDeleteRange(editor.state.doc.resolve(end), "backward"))
        .toEqual({ from: end - 2, to: end });
      expect(spy).toHaveBeenCalledExactlyOnceWith("e\u0301");
      expect(resolveGraphemeDeleteRange(editor.state.doc.resolve(end - 2), "backward")).toBeNull();
      expect(resolveGraphemeDeleteRange(editor.state.doc.resolve(1), "backward")).toBeNull();
    } finally { spy.mockRestore(); editor.destroy(); }
  });

  it("deletes an explicit selection and restores it through the native history keymap", () => {
    const editor = fixture("Le\u0301🙂R");
    try {
      const controller = createQuireEditorInputController({ editor });
      editor.commands.setTextSelection({ from: 2, to: 6 });
      controller.handleKeyDown({ key: "Backspace" });
      expect(editor.state.doc.textContent).toBe("LR");
      expect(editor.commands.undo()).toBe(true);
      expect(editor.state.doc.textContent).toBe("Le\u0301🙂R");
      expect(editor.commands.redo()).toBe(true);
      expect(editor.state.doc.textContent).toBe("LR");
    } finally { editor.destroy(); }
  });

  it("retains structural Backspace joining through the PM keymap", () => {
    const editor = createEditor({ extensions: [StarterKit], content: { type: "doc", content: [
      { type: "paragraph", content: [{ type: "text", text: "first🙂" }] },
      { type: "paragraph", content: [{ type: "text", text: "e\u0301second" }] }
    ] } });
    try {
      editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize + 1);
      createQuireEditorInputController({ editor }).handleKeyDown({ key: "Backspace" });
      expect(editor.state.doc.childCount).toBe(1);
      expect(editor.state.doc.textContent).toBe("first🙂e\u0301second");
    } finally { editor.destroy(); }
  });
});
