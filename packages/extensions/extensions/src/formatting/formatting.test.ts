import {
  createEditor,
  Extension,
  Mark,
  Node,
  type QuireJSONContent
} from "@quirekit/core";
import { Plugin } from "@quirekit/pm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Formatting, readFormatPainterState } from "./formatting";
import { UndoRedo } from "../undo-redo";

const Document = Node.create({
  name: "doc",
  topNode: true,
  content: "block+"
});

const Paragraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "inline*",
  addAttributes() {
    return { styleKind: { default: null, rendered: false } };
  }
});

const Text = Node.create({
  name: "text",
  group: "inline"
});

const Bold = Mark.create({
  name: "bold"
});

const Highlight = Mark.create({
  name: "highlight",
  addAttributes() {
    return { color: { default: null } };
  }
});

const TextStyle = Mark.create({
  name: "textStyle",
  addAttributes() {
    return {
      color: { default: null },
      fontFamily: { default: null },
      fontSize: { default: null },
      languageLatin: { default: null },
      languageEastAsia: { default: null },
      languageComplexScript: { default: null }
    };
  }
});

const InheritedTextStyle = Extension.create({
  name: "inheritedTextStyle",
  addNodeCanvasTextStyles() {
    return {
      paragraph: node => node.attrs.styleKind === "emphasis"
        ? { fontWeight: "bold", fontFamily: "Style Serif" }
        : {}
    };
  }
});

const RejectDocumentChanges = Extension.create({
  name: "rejectDocumentChanges",
  addProseMirrorPlugins() {
    return [new Plugin({
      filterTransaction: transaction => !transaction.docChanged
    })];
  }
});

const baseExtensions = [
  Document,
  Paragraph,
  Text,
  Bold,
  Highlight,
  TextStyle,
  InheritedTextStyle,
  Formatting
];

afterEach(() => {
  vi.useRealTimers();
});

describe("Formatting", () => {
  it("copies without arming the painter and retains formatting across targets and undo", () => {
    const content = styledDocument();
    const editor = createEditor({
      extensions: [...baseExtensions, UndoRedo],
      content: { ...content, content: [...content.content!, { type: "paragraph", content: [{ type: "text", text: "Third" }] }] }
    });
    const original = editor.getJSON();
    editor.commands.setTextSelection({ from: 1, to: 7 });
    expect(editor.commands.copyFormatting()).toBe(true);
    expect(readFormatPainterState(editor.state)).toEqual({ mode: "off", hasSnapshot: true });
    expect(editor.commands.undo()).toBe(false);
    editor.commands.setTextSelection({ from: 9, to: 15 });
    editor.view.dispatchEvent(new Event("pointerup"));
    editor.view.dispatchEvent(Object.assign(new Event("keyup"), { key: "ArrowRight", shiftKey: true }));
    expect(editor.getJSON()).toEqual(original);
    expect(editor.can().pasteFormatting()).toBe(true);
    expect(editor.getJSON()).toEqual(original);
    expect(editor.commands.pasteFormatting()).toBe(true);
    const firstPaste = editor.getJSON();
    expect(editor.commands.pasteFormatting()).toBe(false);
    editor.commands.setTextSelection({ from: 17, to: 22 });
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(editor.state.doc.child(2).firstChild?.marks.map(mark => mark.type.name)).toEqual(["bold", "textStyle"]);
    expect(readFormatPainterState(editor.state)).toEqual({ mode: "off", hasSnapshot: true });
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(firstPaste);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(original);
    expect(readFormatPainterState(editor.state).hasSnapshot).toBe(true);
    editor.destroy();
  });

  it("discards copied formats at read-only and document replacement boundaries", () => {
    const editor = createEditor({ extensions: baseExtensions, content: styledDocument() });
    expect(editor.commands.pasteFormatting()).toBe(false);
    editor.commands.copyFormatting();
    editor.setEditable(false);
    expect(readFormatPainterState(editor.state)).toEqual({ mode: "off", hasSnapshot: false });
    editor.setEditable(true);
    expect(editor.commands.pasteFormatting()).toBe(false);
    editor.commands.copyFormatting();
    editor.commands.replaceDocument({ type: "doc", content: [{ type: "paragraph" }] });
    expect(readFormatPainterState(editor.state)).toEqual({ mode: "off", hasSnapshot: false });
    editor.destroy();
  });

  it("clears visual character format while retaining semantic marks and language", () => {
    const editor = createEditor({
      extensions: baseExtensions,
      content: styledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.clearFormatting()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]).toMatchObject({
      text: "Source",
      marks: [
        { type: "highlight", attrs: { color: "yellow" } },
        {
          type: "textStyle",
          attrs: {
            color: null,
            fontSize: null,
            languageLatin: "en-US"
          }
        }
      ]
    });
    editor.destroy();
  });

  it("captures once, applies atomically, and consumes only a changed target", () => {
    const editor = createEditor({
      extensions: baseExtensions,
      content: styledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(readFormatPainterState(editor.state)).toEqual({
      mode: "once",
      hasSnapshot: true
    });
    expect(editor.commands.pasteFormatting()).toBe(false);
    expect(readFormatPainterState(editor.state).mode).toBe("once");

    expect(editor.commands.setTextSelection({ from: 9, to: 15 })).toBe(true);
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(readFormatPainterState(editor.state).mode).toBe("off");
    expect(editor.getJSON().content?.[1]?.content?.[0]).toMatchObject({
      text: "Target",
      marks: [
        { type: "bold" },
        { type: "highlight", attrs: { color: "green" } },
        {
          type: "textStyle",
          attrs: {
            color: "#336699",
            fontSize: "18pt",
            languageLatin: "zh-CN"
          }
        }
      ]
    });
    editor.destroy();
  });

  it("reports filtered format-painter and clear transactions as rejected", () => {
    const editor = createEditor({
      extensions: [...baseExtensions, RejectDocumentChanges],
      content: styledDocument()
    });
    const before = editor.getJSON();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(editor.commands.setTextSelection({ from: 9, to: 15 })).toBe(true);
    expect(editor.can().pasteFormatting()).toBe(false);
    expect(editor.commands.pasteFormatting()).toBe(false);
    expect(readFormatPainterState(editor.state).mode).toBe("once");

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.can().clearFormatting()).toBe(false);
    expect(editor.commands.clearFormatting()).toBe(false);
    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });

  it("applies after pointer selection completion through the shared view event seam", () => {
    const editor = createEditor({
      extensions: baseExtensions,
      content: styledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(editor.commands.setTextSelection({ from: 9, to: 15 })).toBe(true);
    expect(editor.view.dispatchEvent(new Event("pointerup"))).toBe(false);

    expect(readFormatPainterState(editor.state).mode).toBe("off");
    expect(editor.getJSON().content?.[1]?.content?.[0]).toMatchObject({
      text: "Target",
      marks: [
        { type: "bold" },
        { type: "highlight", attrs: { color: "green" } },
        { type: "textStyle", attrs: { color: "#336699" } }
      ]
    });
    editor.destroy();
  });

  it("keeps state transitions out of history and groups each document action once", () => {
    const editor = createEditor({
      extensions: [...baseExtensions, UndoRedo],
      content: styledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.copyFormatting()).toBe(true);
    expect(editor.commands.undo()).toBe(false);
    expect(editor.commands.setTextSelection({ from: 9, to: 15 })).toBe(true);
    const beforeApply = editor.getJSON();
    expect(editor.commands.pasteFormatting()).toBe(true);
    const afterApply = editor.getJSON();

    expect(editor.commands.clearFormatting()).toBe(true);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(afterApply);
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(beforeApply);
    expect(editor.commands.undo()).toBe(false);
    editor.destroy();
  });

  it("promotes a second press to locked mode and cancels on the next press", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-15T00:00:00Z"));
    const editor = createEditor({
      extensions: baseExtensions,
      content: styledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    vi.setSystemTime(new Date("2026-09-15T00:00:00.200Z"));
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(readFormatPainterState(editor.state).mode).toBe("locked");

    expect(editor.commands.setTextSelection({ from: 9, to: 15 })).toBe(true);
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(readFormatPainterState(editor.state).mode).toBe("locked");
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(readFormatPainterState(editor.state)).toEqual({
      mode: "off",
      hasSnapshot: true
    });
    editor.destroy();
  });

  it("projects effective node typography for a partial character source", () => {
    const editor = createEditor({
      extensions: baseExtensions,
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { styleKind: "emphasis" },
            content: [{ type: "text", text: "Source" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Target" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 2, to: 5 })).toBe(true);
    expect(editor.commands.copyFormatting()).toBe(true);
    expect(editor.commands.setTextSelection({ from: 10, to: 13 })).toBe(true);
    expect(editor.commands.pasteFormatting()).toBe(true);
    expect(editor.getJSON().content?.[1]?.content).toMatchObject([
      { text: "T" },
      {
        text: "arg",
        marks: [
          { type: "bold" },
          { type: "textStyle", attrs: { fontFamily: "Style Serif" } }
        ]
      },
      { text: "et" }
    ]);
    editor.destroy();
  });

  it("cancels transient state for read-only and document replacement boundaries", () => {
    const editor = createEditor({
      extensions: baseExtensions,
      content: styledDocument()
    });

    expect(editor.commands.toggleFormatPainter()).toBe(true);
    editor.dispatchTransaction(editor.state.pm.tr.setMeta("blur", {
      event: {} as FocusEvent
    }));
    expect(readFormatPainterState(editor.state).mode).toBe("once");
    editor.setEditable(false);
    expect(readFormatPainterState(editor.state).mode).toBe("off");

    editor.setEditable(true);
    expect(editor.commands.toggleFormatPainter()).toBe(true);
    expect(editor.commands.replaceDocument({
      type: "doc",
      content: [{ type: "paragraph" }]
    })).toBe(true);
    expect(readFormatPainterState(editor.state).mode).toBe("off");
    editor.destroy();
  });
});

/**
 * Creates source and target paragraphs with semantic fields that must remain target-owned.
 *
 * @returns Two-paragraph formatting fixture.
 */
function styledDocument(): QuireJSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{
          type: "text",
          text: "Source",
          marks: [
            { type: "bold" },
            { type: "highlight", attrs: { color: "yellow" } },
            {
              type: "textStyle",
              attrs: {
                color: "#336699",
                fontSize: "18pt",
                languageLatin: "en-US"
              }
            }
          ]
        }]
      },
      {
        type: "paragraph",
        content: [{
          type: "text",
          text: "Target",
          marks: [
            { type: "highlight", attrs: { color: "green" } },
            {
              type: "textStyle",
              attrs: { color: "#000000", languageLatin: "zh-CN" }
            }
          ]
        }]
      }
    ]
  };
}
