import { Node, QuireEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { Document } from "./document";

const TestParagraph = Node.create({
  name: "paragraph",
  group: "block",
  content: "text*"
});

const TestText = Node.create({
  name: "text",
  group: "inline"
});

describe("Document font commands", () => {
  it("updates every document-default script slot and preserves unrelated state", () => {
    const editor = createDocumentEditor();
    const content = editor.state.doc.content.toJSON();
    const fontTable = editor.state.doc.attrs.fontTable;
    const selection = editor.state.pm.selection.toJSON();

    expect(editor.commands.setDocumentFontFamily("  Company Sans  ")).toBe(true);
    expect(editor.state.doc.attrs.fontTheme).toEqual({
      body: {
        latin: "Company Sans",
        eastAsia: "Company Sans",
        complexScript: "Company Sans",
        fallbacks: ["Body Fallback"]
      },
      heading: {
        latin: "Company Sans",
        eastAsia: "Company Sans",
        complexScript: "Company Sans",
        fallbacks: ["Heading Fallback"]
      }
    });
    expect(editor.state.doc.content.toJSON()).toEqual(content);
    expect(editor.state.doc.attrs.fontTable).toEqual(fontTable);
    expect(editor.state.pm.selection.toJSON()).toEqual(selection);
    editor.destroy();
  });

  it("rejects empty families and avoids an equal-theme transaction", () => {
    const editor = createDocumentEditor();
    expect(editor.commands.setDocumentFontFamily("   ")).toBe(false);
    expect(editor.commands.setDocumentFontFamily("Same Font")).toBe(true);
    const transactionCount = editor.state.pm.plugins.length;
    const before = editor.state.doc;
    expect(editor.commands.setDocumentFontFamily("Same Font")).toBe(false);
    expect(editor.state.doc).toBe(before);
    expect(editor.state.pm.plugins).toHaveLength(transactionCount);
    editor.destroy();
  });

  it("updates Latin defaults without overwriting East Asian or complex script", () => {
    const editor = createDocumentEditor();
    expect(editor.commands.setDocumentLatinFontFamily("  Company Latin  ")).toBe(true);
    expect(editor.state.doc.attrs.fontTheme).toEqual({
      body: {
        latin: "Company Latin",
        eastAsia: "Body CJK",
        complexScript: "Body CS",
        fallbacks: ["Body Fallback"]
      },
      heading: {
        latin: "Company Latin",
        eastAsia: "Heading CJK",
        complexScript: "Heading CS",
        fallbacks: ["Heading Fallback"]
      }
    });
    expect(editor.commands.setDocumentLatinFontFamily("Company Latin")).toBe(false);
    editor.destroy();
  });

  it("updates East Asian defaults without overwriting Latin or complex script", () => {
    const editor = createDocumentEditor();
    expect(editor.commands.setDocumentEastAsiaFontFamily("企业宋体")).toBe(true);
    expect(editor.state.doc.attrs.fontTheme).toEqual({
      body: {
        latin: "Body Latin",
        eastAsia: "企业宋体",
        complexScript: "Body CS",
        fallbacks: ["Body Fallback"]
      },
      heading: {
        latin: "Heading Latin",
        eastAsia: "企业宋体",
        complexScript: "Heading CS",
        fallbacks: ["Heading Fallback"]
      }
    });
    editor.destroy();
  });
});

/**
 * Creates a minimal document editor with non-font root state.
 *
 * @returns Editor configured with the document command under test.
 */
function createDocumentEditor(): QuireEditor {
  return new QuireEditor({
    extensions: [Document, TestParagraph, TestText],
    content: {
      type: "doc",
      attrs: {
        fontTheme: {
          body: {
            latin: "Body Latin",
            eastAsia: "Body CJK",
            complexScript: "Body CS",
            fallbacks: ["Body Fallback"]
          },
          heading: {
            latin: "Heading Latin",
            eastAsia: "Heading CJK",
            complexScript: "Heading CS",
            fallbacks: ["Heading Fallback"]
          }
        },
        fontTable: { fonts: [{ name: "Body Latin" }] }
      },
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "Document text" }]
      }]
    }
  });
}
