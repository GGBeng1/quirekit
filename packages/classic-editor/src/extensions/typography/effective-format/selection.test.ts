import {
  createEditor,
  Extension,
  quireDefaultDocumentFontTheme,
  type QuireEditorContent
} from "@quirekit/core";
import { TextStyle } from "@quirekit/extension-text-style";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import {
  resolveClassicEffectiveFontFamily,
  resolveClassicEffectiveFontSize
} from "./index";

describe("Classic effective character formatting state", () => {
  it("reads complex-script direct, inherited and mixed values independently of Latin", () => {
    const editor = createFormattingEditor({ type: "doc", attrs: { fontTheme: {
      body: { latin: "Latin Theme", eastAsia: "CJK Theme", complexScript: "Complex Theme" }
    } }, content: [{ type: "paragraph", content: [
      { type: "text", text: "a", marks: [{ type: "textStyle", attrs: { fontFamilyLatin: "Latin Direct" } }] },
      { type: "text", text: "ع", marks: [{ type: "textStyle", attrs: { fontFamilyComplexScript: "Amiri" } }] }
    ] }] });
    editor.commands.setTextSelection({ from: 1, to: 2 });
    expect(resolveClassicEffectiveFontFamily(editor, "complexScript", "en"))
      .toEqual({ kind: "single", value: "Complex Theme", hasDirect: false });
    editor.commands.setTextSelection({ from: 2, to: 3 });
    expect(resolveClassicEffectiveFontFamily(editor, "complexScript", "en"))
      .toEqual({ kind: "single", value: "Amiri", hasDirect: true });
    expect(resolveClassicEffectiveFontFamily(editor, "all", "en"))
      .toEqual({ kind: "single", value: "Amiri", hasDirect: true });
    editor.commands.setTextSelection({ from: 1, to: 3 });
    expect(resolveClassicEffectiveFontFamily(editor, "complexScript", "en"))
      .toEqual({ kind: "mixed", hasDirect: true });
    editor.destroy();
  });

  it("reads the complex-script slot inherited from node and default character styles", () => {
    const editor = createEditor({ extensions: [StarterKit, TextStyle, Extension.create({
      name: "inheritedFonts",
      addNodeCanvasTextStyles() {
        return { paragraph: () => ({ fontFamilyComplexScript: "Paragraph CS", defaultInlineStyle: { fontFamilyComplexScript: "Character CS" } }) };
      }
    })], content: "<p>العربية</p>" });
    editor.commands.setTextSelection({ from: 1, to: 8 });
    expect(resolveClassicEffectiveFontFamily(editor, "complexScript", "zh-CN"))
      .toEqual({ kind: "single", value: "Character CS", hasDirect: false });
    editor.destroy();
  });

  it("projects inherited body defaults at an unmarked caret", () => {
    const editor = createFormattingEditor({
      type: "doc",
      attrs: {
        fontTheme: {
          body: {
            latin: "Fixture Latin",
            eastAsia: "示例宋体",
            complexScript: "Fixture Complex"
          }
        }
      },
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "正文" }]
      }]
    });

    editor.commands.setTextSelection(2);

    expect(resolveClassicEffectiveFontFamily(editor, "all", "zh-CN"))
      .toEqual({ kind: "single", value: "示例宋体", hasDirect: false });
    expect(resolveClassicEffectiveFontSize(editor))
      .toEqual({ kind: "single", value: 12, hasDirect: false });
  });

  it("projects heading theme and node scale before direct formatting", () => {
    const editor = createFormattingEditor({
      type: "doc",
      attrs: {
        fontTheme: {
          body: { latin: "Body Latin", eastAsia: "正文宋体" },
          heading: { latin: "Heading Latin", eastAsia: "标题宋体" }
        }
      },
      content: [{
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "标题" }]
      }]
    });

    editor.commands.setTextSelection(2);

    expect(resolveClassicEffectiveFontFamily(editor, "all", "zh-CN"))
      .toEqual({ kind: "single", value: "标题宋体", hasDirect: false });
    expect(resolveClassicEffectiveFontSize(editor))
      .toEqual({ kind: "single", value: 24, hasDirect: false });
  });

  it("uses an Extension-owned heading font role for a paragraph-backed heading", () => {
    const paragraphHeadingRole = Extension.create({
      name: "paragraphHeadingRole",
      addNodeCanvasTextStyles() {
        return {
          paragraph: () => ({
            documentFontRole: "heading" as const,
            fontScale: 1.5
          })
        };
      }
    });
    const editor = createEditor({
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        TextStyle,
        paragraphHeadingRole
      ],
      content: {
        type: "doc",
        attrs: {
          fontTheme: {
            body: { latin: "Body Latin", eastAsia: "正文宋体" },
            heading: { latin: "Heading Latin", eastAsia: "标题宋体" }
          }
        },
        content: [{
          type: "paragraph",
          content: [{ type: "text", text: "标题 Title" }]
        }]
      }
    });

    editor.commands.setTextSelection(2);

    expect(resolveClassicEffectiveFontFamily(editor, "eastAsia", "zh-CN"))
      .toEqual({ kind: "single", value: "标题宋体", hasDirect: false });
    expect(resolveClassicEffectiveFontFamily(editor, "latin", "zh-CN"))
      .toEqual({ kind: "single", value: "Heading Latin", hasDirect: false });
    expect(resolveClassicEffectiveFontSize(editor))
      .toEqual({ kind: "single", value: 18, hasDirect: false });
  });

  it("keeps equal inherited and direct values as one effective value", () => {
    const editor = createFormattingEditor({
      type: "doc",
      attrs: { fontTheme: quireDefaultDocumentFontTheme },
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "a" },
          {
            type: "text",
            text: "b",
            marks: [{
              type: "textStyle",
              attrs: { fontFamilyLatin: "Calibri", fontSize: "12pt" }
            }]
          }
        ]
      }]
    });

    editor.commands.setTextSelection({ from: 1, to: 3 });

    expect(resolveClassicEffectiveFontFamily(editor, "all", "en"))
      .toEqual({ kind: "single", value: "Calibri", hasDirect: true });
    expect(resolveClassicEffectiveFontSize(editor))
      .toEqual({ kind: "single", value: 12, hasDirect: true });
  });

  it("reports mixed only when selected effective values differ", () => {
    const editor = createFormattingEditor({
      type: "doc",
      attrs: { fontTheme: quireDefaultDocumentFontTheme },
      content: [{
        type: "paragraph",
        content: [
          { type: "text", text: "a" },
          {
            type: "text",
            text: "大",
            marks: [{
              type: "textStyle",
              attrs: { fontFamilyEastAsia: "Fixture CJK", fontSize: "18pt" }
            }]
          }
        ]
      }]
    });

    editor.commands.setTextSelection({ from: 1, to: 3 });

    expect(resolveClassicEffectiveFontFamily(editor, "all", "zh-CN"))
      .toEqual({ kind: "mixed", hasDirect: true });
    expect(resolveClassicEffectiveFontSize(editor))
      .toEqual({ kind: "mixed", hasDirect: true });
  });

  it("queries explicit script targets independently of selected text", () => {
    const editor = createFormattingEditor({
      type: "doc",
      attrs: {
        fontTheme: {
          body: { latin: "Body Latin", eastAsia: "正文宋体" }
        }
      },
      content: [{
        type: "paragraph",
        content: [{ type: "text", text: "abc" }]
      }]
    });

    editor.commands.setTextSelection({ from: 1, to: 4 });

    expect(resolveClassicEffectiveFontFamily(editor, "latin", "zh-CN"))
      .toEqual({ kind: "single", value: "Body Latin", hasDirect: false });
    expect(resolveClassicEffectiveFontFamily(editor, "eastAsia", "zh-CN"))
      .toEqual({ kind: "single", value: "正文宋体", hasDirect: false });
  });
});

/**
 * Creates one minimal editor with the typography schema installed.
 *
 * @param content - Canonical document fixture.
 * @returns Editor ready for selection-state queries.
 */
function createFormattingEditor(content: QuireEditorContent) {
  return createEditor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      TextStyle
    ],
    content
  });
}
