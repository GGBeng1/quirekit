import { Editor, Extension } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { FontFamily } from "./font-family";
import {
  getNextFontSize,
  normalizeFontSize
} from "./font-size";
import { normalizeLetterSpacing } from "./letter-spacing";
import { normalizeRunLanguage } from "./language";
import { renderTextStyleAttributes } from "./style-attributes";
import { TextStyle } from "./text-style";
import { TextStyleKit } from "./text-style-kit";
import { createTextStyleTestExtensions } from "./testing/extensions";

describe("text style extensions", () => {
  it("stores font family on the textStyle mark", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setFontFamily("DejaVu Serif")).toBe(true);

    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Styled",
              marks: [
                {
                  type: "textStyle",
                  attrs: {
                    fontFamily: "DejaVu Serif",
                    fontFamilyLatin: null,
                    fontFamilyEastAsia: null,
                    fontFamilyComplexScript: null,
                    color: null,
                    backgroundColor: null,
                    fontSize: null,
                    fontSizeComplexScript: null,
                    letterSpacing: null,
                    characterGrid: null,
                    textScale: null,
                    bold: null,
                    italic: null,
                    allCaps: null,
                    smallCaps: null,
                    boldCs: null,
                    italicCs: null,
                    rightToLeft: null,
                    hidden: null,
                    outline: null,
                    shadow: null,
                    emboss: null,
                    imprint: null,
                    emphasisMark: null,
                    languageLatin: null,
                    languageEastAsia: null,
                    languageComplexScript: null,
                    litAstTextStylePreservation: null
                  }
                }
              ]
            }
          ]
        }
      ]
    });
  });

  it("applies Latin and East Asian families without flattening the other slot", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setFontFamily("Noto Serif")).toBe(true);
    expect(editor.commands.setLatinFontFamily("Aptos")).toBe(true);
    expect(editor.commands.setEastAsiaFontFamily("Noto Serif CJK SC")).toBe(true);

    expect(editor.getAttributes("textStyle")).toMatchObject({
      fontFamily: "Noto Serif",
      fontFamilyLatin: "Aptos",
      fontFamilyEastAsia: "Noto Serif CJK SC",
      fontFamilyComplexScript: null
    });
  });

  it("clears script overrides when applying the all-script font preset", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setLatinFontFamily("Aptos")).toBe(true);
    expect(editor.commands.setEastAsiaFontFamily("宋体")).toBe(true);
    expect(editor.commands.setFontFamily("Noto Serif SC")).toBe(true);

    expect(editor.getAttributes("textStyle")).toMatchObject({
      fontFamily: "Noto Serif SC",
      fontFamilyLatin: null,
      fontFamilyEastAsia: null,
      fontFamilyComplexScript: null
    });
  });

  it("retains a script family in stored marks for subsequent typing", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 7, to: 7 })).toBe(true);
    expect(editor.commands.setEastAsiaFontFamily("宋体")).toBe(true);
    expect(editor.commands.insertContent("中")).toBe(true);

    expect(editor.getJSON().content?.[0]?.content?.[1]).toMatchObject({
      type: "text",
      text: "中",
      marks: [{
        type: "textStyle",
        attrs: { fontFamilyEastAsia: "宋体" }
      }]
    });
  });

  it("retains script families in Quire-owned HTML data attributes", () => {
    expect(renderTextStyleAttributes({
      fontFamilyLatin: "Aptos",
      fontFamilyEastAsia: "宋体"
    })).toEqual({
      "data-qk-font-family-latin": "Aptos",
      "data-qk-font-family-east-asia": "宋体"
    });
  });

  it("removes empty textStyle marks after unsetting attributes", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setFontFamily("DejaVu Serif")).toBe(true);
    expect(editor.commands.unsetFontFamily()).toBe(true);

    expect(editor.getJSON()).toEqual({
      type: "doc",
      attrs: { fontTable: null, fontTheme: null },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Styled" }]
        }
      ]
    });
  });

  it("exposes the related textStyle command extensions through TextStyleKit", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: createStyledDocument()
    });

    expect(editor.commands.setFontFamily).toBeTypeOf("function");
    expect(editor.commands.setLatinFontFamily).toBeTypeOf("function");
    expect(editor.commands.setEastAsiaFontFamily).toBeTypeOf("function");
    expect(editor.commands.setComplexScriptFontFamily).toBeTypeOf("function");
    expect(editor.commands.setColor).toBeTypeOf("function");
    expect(editor.commands.setBackgroundColor).toBeTypeOf("function");
    expect(editor.commands.setFontSize).toBeTypeOf("function");
    expect(editor.commands.increaseFontSize).toBeTypeOf("function");
    expect(editor.commands.decreaseFontSize).toBeTypeOf("function");
    expect(editor.commands.setLetterSpacing).toBeTypeOf("function");
    expect(editor.commands.unsetLetterSpacing).toBeTypeOf("function");
    expect(editor.commands.setLanguage).toBeTypeOf("function");
    expect(editor.commands.setLanguageSlots).toBeTypeOf("function");
    expect(editor.commands.setLatinLanguage).toBeTypeOf("function");
    expect(editor.commands.setEastAsiaLanguage).toBeTypeOf("function");
    expect(editor.commands.setComplexScriptLanguage).toBeTypeOf("function");
    expect(editor.commands.setRunRightToLeft).toBeTypeOf("function");
    expect(editor.commands.setDirectBoldState).toBeTypeOf("function");
    expect(editor.commands.setDirectItalicState).toBeTypeOf("function");
    expect(editor.commands.unsetRunRightToLeft).toBeTypeOf("function");
    expect(editor.commands.setHiddenText).toBeTypeOf("function");
    expect(editor.commands.setTextOutline).toBeTypeOf("function");
    expect(editor.commands.setTextShadow).toBeTypeOf("function");
    expect(editor.commands.setTextEmboss).toBeTypeOf("function");
    expect(editor.commands.setTextImprint).toBeTypeOf("function");
    expect(editor.commands.setEmphasisMark).toBeTypeOf("function");
    expect(editor.commands.unsetEmphasisMark).toBeTypeOf("function");
    expect(editor.commands.setLineHeight).toBeUndefined();
  });

  it("edits and serializes three independent Word language slots", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: createStyledDocument()
    });

    expect(normalizeRunLanguage("EN-us")).toBe("en-US");
    expect(normalizeRunLanguage("x-none")).toBe("x-none");
    expect(normalizeRunLanguage("bad_tag")).toBeNull();
    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setLanguageSlots({
      latin: "EN-us",
      eastAsia: "zh-cn",
      complexScript: "ar-sa"
    })).toBe(true);
    expect(editor.commands.setLanguageSlots({
      latin: "en-US",
      eastAsia: "bad_tag",
      complexScript: "ar-SA"
    })).toBe(false);
    expect(editor.commands.setLatinLanguage("bad_tag")).toBe(false);
    expect(editor.getAttributes("textStyle")).toMatchObject({
      languageLatin: "en-US",
      languageEastAsia: "zh-CN",
      languageComplexScript: "ar-SA"
    });
    expect(renderTextStyleAttributes({
      languageLatin: "en-US",
      languageEastAsia: "zh-CN",
      languageComplexScript: "ar-SA"
    })).toEqual({
      lang: "en-US",
      "data-qk-language-latin": "en-US",
      "data-qk-language-east-asia": "zh-CN",
      "data-qk-language-complex-script": "ar-SA"
    });
    expect(editor.commands.unsetLanguage()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("normalizes and edits signed Word-compatible character spacing", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: createStyledDocument()
    });

    expect(normalizeLetterSpacing("1.5pt")).toBe("1.5pt");
    expect(normalizeLetterSpacing("2px")).toBe("1.5pt");
    expect(normalizeLetterSpacing(-0.25)).toBe("-0.25pt");
    expect(normalizeLetterSpacing("0pt")).toBe("0pt");
    expect(normalizeLetterSpacing("normal")).toBeNull();
    expect(normalizeLetterSpacing("calc(1pt + 1px)")).toBeNull();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setLetterSpacing("-0.5pt")).toBe(true);
    expect(editor.getAttributes("textStyle").letterSpacing).toBe("-0.5pt");
    expect(editor.commands.setLetterSpacing("wide")).toBe(false);
    expect(editor.getAttributes("textStyle").letterSpacing).toBe("-0.5pt");
    expect(renderTextStyleAttributes({ letterSpacing: "-0.5pt" }))
      .toEqual({ style: "letter-spacing: -0.5pt" });
    expect(editor.commands.unsetLetterSpacing()).toBe(true);
    expect(editor.getAttributes("textStyle").letterSpacing).toBeUndefined();
  });

  it("edits mutually exclusive Word case styles as one textStyle value", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: createStyledDocument()
    });

    expect(editor.commands.setAllCaps).toBeTypeOf("function");
    expect(editor.commands.setSmallCaps).toBeTypeOf("function");
    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setAllCaps()).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({
      allCaps: true,
      smallCaps: null
    });
    expect(renderTextStyleAttributes({ allCaps: true })).toEqual({
      style: "text-transform: uppercase"
    });

    expect(editor.commands.setSmallCaps()).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({
      allCaps: null,
      smallCaps: true
    });
    expect(renderTextStyleAttributes({ smallCaps: true })).toEqual({
      style: "font-variant-caps: small-caps"
    });
    expect(editor.commands.unsetSmallCaps()).toBe(true);
    expect(editor.getAttributes("textStyle").smallCaps).toBeUndefined();
  });

  it("edits explicit Word run direction without collapsing false into absence", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setRunRightToLeft(true)).toBe(true);
    expect(editor.getAttributes("textStyle").rightToLeft).toBe(true);
    expect(renderTextStyleAttributes({ rightToLeft: true })).toEqual({
      "data-qk-run-right-to-left": "true",
      dir: "rtl"
    });

    expect(editor.commands.setRunRightToLeft(false)).toBe(true);
    expect(editor.getAttributes("textStyle").rightToLeft).toBe(false);
    expect(renderTextStyleAttributes({ rightToLeft: false })).toEqual({
      "data-qk-run-right-to-left": "false"
    });
    expect(editor.commands.setRunRightToLeft("true" as never)).toBe(false);

    expect(editor.commands.unsetRunRightToLeft()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("edits hidden text and legacy glyph effects with exact boolean state", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setHiddenText(false)).toBe(true);
    expect(editor.commands.setTextOutline(true)).toBe(true);
    expect(editor.commands.setTextShadow(false)).toBe(true);
    expect(editor.commands.setTextEmboss(true)).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({
      hidden: false,
      outline: true,
      shadow: false,
      emboss: true,
      imprint: null
    });

    expect(editor.commands.setTextImprint(true)).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({
      emboss: null,
      imprint: true
    });
    expect(renderTextStyleAttributes({
      hidden: false,
      outline: true,
      shadow: false,
      emboss: null,
      imprint: true
    })).toEqual({
      "data-qk-hidden-text": "false",
      "data-qk-text-outline": "true",
      "data-qk-text-shadow": "false",
      "data-qk-text-imprint": "true"
    });
    expect(TextStyle.config.canvasStyle?.(
      editor.state.doc.firstChild!.firstChild!.marks[0]!
    )).toMatchObject({
      hidden: false,
      glyphEffectOverrides: { outline: true, shadow: false, imprint: true }
    });
    expect(editor.commands.setTextOutline("true" as never)).toBe(false);
  });

  it("edits, serializes, and paints the closed emphasis-mark value space", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setEmphasisMark("circle")).toBe(true);
    expect(editor.getAttributes("textStyle").emphasisMark).toBe("circle");
    expect(renderTextStyleAttributes({ emphasisMark: "circle" })).toEqual({
      "data-qk-emphasis-mark": "circle"
    });
    expect(TextStyle.config.canvasStyle?.(
      editor.state.doc.firstChild!.firstChild!.marks[0]!
    )).toMatchObject({ emphasisMark: "circle" });

    expect(editor.commands.setEmphasisMark("none")).toBe(true);
    expect(editor.getAttributes("textStyle").emphasisMark).toBe("none");
    expect(renderTextStyleAttributes({ emphasisMark: "none" })).toEqual({
      "data-qk-emphasis-mark": "none"
    });
    expect(TextStyle.config.canvasStyle?.(
      editor.state.doc.firstChild!.firstChild!.marks[0]!
    )).toMatchObject({ emphasisMark: "none" });
    expect(editor.commands.setEmphasisMark("triangle" as never)).toBe(false);
    expect(editor.commands.unsetEmphasisMark()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("edits exact complex-script emphasis and retains explicit false in HTML", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: createStyledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setComplexScriptBold(true)).toBe(true);
    expect(editor.commands.setComplexScriptItalic(false)).toBe(true);
    expect(editor.getAttributes("textStyle")).toMatchObject({
      boldCs: true,
      italicCs: false
    });
    expect(renderTextStyleAttributes({ boldCs: true, italicCs: false }))
      .toEqual({
        "data-qk-bold-complex-script": "true",
        "data-qk-italic-complex-script": "false"
      });
    expect(editor.commands.unsetComplexScriptBold()).toBe(true);
    expect(editor.getAttributes("textStyle").boldCs).toBeNull();
  });

  it("authors nullable ordinary bold and italic direct state without conflicts", () => {
    const editor = createTextStyleEditor();

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setDirectBoldState(false)).toBe(true);
    expect(editor.commands.setDirectItalicState(false)).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([{
      type: "textStyle",
      attrs: expect.objectContaining({ bold: false, italic: false })
    }]);
    expect(renderTextStyleAttributes({ bold: false, italic: false })).toEqual({
      "data-qk-direct-bold": "false",
      "data-qk-direct-italic": "false",
      style: "font-weight: normal; font-style: normal"
    });
    expect(TextStyle.config.canvasStyle?.(
      editor.state.doc.firstChild!.firstChild!.marks[0]!
    )).toMatchObject({ fontWeight: "normal", fontStyle: "normal" });

    expect(editor.commands.setDirectBoldState(true)).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks)
      .toContainEqual({ type: "bold" });
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toContainEqual({
      type: "textStyle",
      attrs: expect.objectContaining({ bold: null, italic: false })
    });
    expect(editor.commands.setDirectBoldState(null)).toBe(true);
    expect(editor.commands.setDirectItalicState(null)).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
    expect(editor.commands.setDirectBoldState("false" as never)).toBe(false);
  });

  it("toggles inherited heading bold through explicit false and back to inheritance", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyle
      ],
      content: {
        type: "doc",
        content: [{
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Inherited" }]
        }]
      }
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 10 })).toBe(true);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([{
      type: "textStyle",
      attrs: expect.objectContaining({ bold: false })
    }]);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("normalizes a legacy textStyle true emphasis value on the next toggle", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyle
      ],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [{
            type: "text",
            text: "Legacy",
            marks: [{ type: "textStyle", attrs: { bold: true } }]
          }]
        }]
      }
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
  });

  it("canonicalizes a mixed inherited selection without flattening either paragraph", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyle
      ],
      content: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Bold" }]
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Plain" }]
          }
        ]
      }
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 12 })).toBe(true);
    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toBeUndefined();
    expect(editor.getJSON().content?.[1]?.content?.[0]?.marks)
      .toEqual([{ type: "bold" }]);

    expect(editor.commands.toggleBold()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks).toEqual([{
      type: "textStyle",
      attrs: expect.objectContaining({ bold: false })
    }]);
    expect(editor.getJSON().content?.[1]?.content?.[0]?.marks).toBeUndefined();
  });

  it("toggles calculated italic and keeps the collapsed stored-mark state canonical", () => {
    const inheritedItalic = Extension.create({
      name: "inheritedItalicForTest",
      priority: 120,
      addNodeCanvasTextStyles() {
        return { paragraph: () => ({ fontStyle: "italic" as const }) };
      }
    });
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        inheritedItalic,
        TextStyle
      ],
      content: createStyledDocument()
    });

    expect(editor.commands.setTextSelection({ from: 7, to: 7 })).toBe(true);
    expect(editor.commands.toggleItalic()).toBe(true);
    expect(editor.commands.insertContent("X")).toBe(true);
    expect(editor.getJSON().content?.[0]?.content?.[1]?.marks).toEqual([{
      type: "textStyle",
      attrs: expect.objectContaining({ italic: false })
    }]);
  });

  it("validates direct point sizes and follows Word-compatible progression", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: createStyledDocument()
    });

    expect(normalizeFontSize("16pt")).toBe("16pt");
    expect(normalizeFontSize(18)).toBe("18pt");
    expect(normalizeFontSize("0pt")).toBeNull();
    expect(normalizeFontSize("301pt")).toBeNull();
    expect(getNextFontSize(12, true)).toBe(14);
    expect(getNextFontSize(73, true)).toBe(80);
    expect(getNextFontSize(73, false)).toBe(72);
    expect(getNextFontSize(8, false)).toBe(7);

    expect(editor.commands.setTextSelection({ from: 1, to: 7 })).toBe(true);
    expect(editor.commands.setFontSize("16pt")).toBe(true);
    expect(editor.commands.setFontSize("16px")).toBe(false);
    expect(editor.getAttributes("textStyle").fontSize).toBe("16pt");
    expect(editor.commands.setComplexScriptFontSize("18pt")).toBe(true);
    expect(editor.commands.setComplexScriptFontSize("18px")).toBe(false);
    expect(editor.getAttributes("textStyle").fontSizeComplexScript).toBe("18pt");
    expect(renderTextStyleAttributes({ fontSizeComplexScript: "18pt" }))
      .toEqual({ "data-qk-font-size-complex-script": "18pt" });
    expect(editor.commands.unsetComplexScriptFontSize()).toBe(true);
    expect(editor.getAttributes("textStyle").fontSizeComplexScript).toBeNull();
  });

  it("advances every mixed selected font size without flattening the range", () => {
    const editor = new Editor({
      extensions: [
        ...createTextStyleTestExtensions(),
        TextStyleKit
      ],
      content: {
        type: "doc",
        content: [{
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Small",
              marks: [{ type: "textStyle", attrs: { fontSize: "8pt" } }]
            },
            {
              type: "text",
              text: "Large",
              marks: [{ type: "textStyle", attrs: { fontSize: "72pt" } }]
            }
          ]
        }]
      }
    });

    expect(editor.commands.setTextSelection({ from: 1, to: 11 })).toBe(true);
    expect(editor.commands.increaseFontSize()).toBe(true);
    expect(editor.getJSON().content?.[0]?.content).toMatchObject([
      { text: "Small", marks: [{ attrs: { fontSize: "9pt" } }] },
      { text: "Large", marks: [{ attrs: { fontSize: "80pt" } }] }
    ]);
  });

});

/**
 * Creates an editor with TextStyle and FontFamily extensions installed.
 *
 * @returns Editor ready for textStyle command tests.
 */
function createTextStyleEditor(): Editor {
  return new Editor({
    extensions: [
      ...createTextStyleTestExtensions(),
      TextStyle,
      FontFamily
    ],
    content: createStyledDocument()
  });
}

/**
 * Creates a one-paragraph JSON fixture.
 *
 * @returns Tiptap-compatible JSON content.
 */
function createStyledDocument() {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Styled" }]
      }
    ]
  };
}
