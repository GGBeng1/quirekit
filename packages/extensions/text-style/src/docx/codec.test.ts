import type { QuireJSONContent } from "@quirekit/core";
import {
  decodeLitAstPreservation,
  docx,
  type DocxMarkExportContext,
  type DocxMarkImportContext
} from "@quirekit/lit-docx-contract";
import { describe, expect, it, vi } from "vitest";
import { textStyleDocxCodec } from "./codec";
import { resolveTextStyleCanvasStyle } from "../text-style/canvas-style";

type QuireMark = NonNullable<QuireJSONContent["marks"]>[number];

describe("textStyle DOCX codec", () => {
  it.each([true, false])("preserves the independent character-grid switch: %s", snapToGrid => {
    const imported = textStyleDocxCodec.import!.convert(createImportContext({ type: "textStyle", attrs: { snapToGrid } }))[0]!;
    expect(imported).toMatchObject({ attrs: { characterGrid: snapToGrid } });
    expect(resolveTextStyleCanvasStyle(imported as never)).toEqual({ characterGrid: snapToGrid });
    expect(textStyleDocxCodec.export!.convert(createExportContext(imported))).toEqual([{ type: "textStyle", attrs: { snapToGrid } }]);
  });
  it.each(["default", "eastAsia", "cs", "future"])("projects a preserved hint without losing its source: %s", fontHint => {
    const imported = textStyleDocxCodec.import!.convert(createImportContext({ type: "textStyle", attrs: { fontHint } }))[0]!;
    expect(resolveTextStyleCanvasStyle(imported as never)).toEqual({ fontSelectionHint: fontHint });
    expect(textStyleDocxCodec.export!.convert(createExportContext(imported))).toEqual([{ type: "textStyle", attrs: { fontHint } }]);
  });
  it("projects editable font slots and preserves producer-only attributes", () => {
    const imported = textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: {
          fontFamily: "Aptos",
          fontFamilyEastAsia: "DengXian",
          fontFamilyComplexScript: "Arial",
          fontSize: "11pt",
          fontSizeComplexScript: "13pt",
          letterSpacing: "2px",
          bold: false,
          italic: false,
          color: "#112233",
          themeColor: "accent1",
          allCaps: true,
          boldCs: false,
          italicCs: true,
          rtl: false,
          vanish: false,
          outline: true,
          shadow: false,
          emboss: true,
          imprint: false,
          emphasisMark: "underDot",
          lang: { val: "en-US", eastAsia: "zh-CN", bidi: "ar-SA" }
        }
      })
    )[0]!;

    expect(imported).toMatchObject({
      type: "textStyle",
      attrs: {
        fontFamilyLatin: "Aptos",
        fontFamilyEastAsia: "DengXian",
        fontFamilyComplexScript: "Arial",
        fontSize: "11pt",
        fontSizeComplexScript: "13pt",
        letterSpacing: "1.5pt",
        bold: false,
        italic: false,
        allCaps: true,
        boldCs: false,
        italicCs: true,
        rightToLeft: false,
        hidden: false,
        outline: true,
        shadow: false,
        emboss: true,
        imprint: false,
        emphasisMark: "underDot",
        languageLatin: "en-US",
        languageEastAsia: "zh-CN",
        languageComplexScript: "ar-SA",
        color: "#112233"
      }
    });
    expect(decodeLitAstPreservation(
      imported.attrs?.litAstTextStylePreservation
    )).toMatchObject({
      attributes: {
        themeColor: "accent1"
      }
    });

    expect(textStyleDocxCodec.export!.convert(
      createExportContext(imported)
    )[0]).toEqual({
      type: "textStyle",
      attrs: {
        themeColor: "accent1",
        allCaps: true,
        boldCs: false,
        italicCs: true,
        rtl: false,
        vanish: false,
        outline: true,
        shadow: false,
        emboss: true,
        imprint: false,
        emphasisMark: "underDot",
        lang: { val: "en-US", eastAsia: "zh-CN", bidi: "ar-SA" },
        fontFamily: "Aptos",
        fontFamilyEastAsia: "DengXian",
        fontFamilyComplexScript: "Arial",
        fontSize: "11pt",
        fontSizeComplexScript: "13pt",
        letterSpacing: "1.5pt",
        bold: false,
        italic: false,
        color: "#112233"
      }
    });
  });

  it("rejects malformed values in any independent language slot", () => {
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { lang: { val: "bad_tag" } }
      })
    )).toThrowError("Unsupported textStyle.lang.val");
    expect(() => textStyleDocxCodec.export!.convert(
      createExportContext({
        type: "textStyle",
        attrs: { languageComplexScript: "bad_tag" }
      })
    )).toThrowError("Unsupported textStyle.languageComplexScript");
  });

  it("rejects malformed point sizes at the owning feature boundary", () => {
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { fontSize: "large" }
      })
    )).toThrowError('Unsupported textStyle fontSize "large"');
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { fontSizeComplexScript: "0pt" }
      })
    )).toThrowError("Out-of-range textStyle fontSizeComplexScript");
  });

  it("rejects unsupported character-spacing expressions at the codec boundary", () => {
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { letterSpacing: "calc(1pt + 1px)" }
      })
    )).toThrowError("Unsupported textStyle.letterSpacing");
  });

  it("validates native Word case-style booleans at the codec boundary", () => {
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { smallCaps: "true" }
      })
    )).toThrowError("Unsupported textStyle.smallCaps");
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { bold: true }
      })
    )).toThrowError("semantic true requires the bold mark");
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { italicCs: "false" }
      })
    )).toThrowError("Unsupported textStyle.italicCs");
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { rtl: "false" }
      })
    )).toThrowError("Unsupported textStyle.rtl");
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { outline: "false" }
      })
    )).toThrowError("Unsupported textStyle.outline");
    expect(() => textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { emphasisMark: "triangle" }
      })
    )).toThrowError("Unsupported textStyle.emphasisMark");
  });

  it("preserves the complete direct-run OOXML envelope through the model codec", () => {
    const source = {
      rawChildren: [
        { "w:b": [], ":@": { "@_w:val": "0" } },
        { "w:noProof": [] },
        { "w:specVanish": [] }
      ],
      semantic: { bold: false }
    };
    const imported = textStyleDocxCodec.import!.convert(
      createImportContext({
        type: "textStyle",
        attrs: { _rPrPreservation: source }
      })
    )[0]!;

    expect(decodeLitAstPreservation(
      imported.attrs?.litAstTextStylePreservation
    )).toMatchObject({
      attributes: { _rPrPreservation: source }
    });
    expect(textStyleDocxCodec.export!.convert(
      createExportContext(imported)
    )[0]).toEqual({
      type: "textStyle",
      attrs: { _rPrPreservation: source }
    });
  });
});

/**
 * Creates one isolated structural mark import context.
 *
 * @param mark - Source LitAST mark.
 * @returns Context with identity partial-attribute composition.
 */
function createImportContext(
  mark: DocxMarkImportContext<QuireMark>["mark"]
): DocxMarkImportContext<QuireMark> {
  return {
    mark,
    path: "document.children[0].marks[0]",
    lossPolicy: "strict",
    resolveService: () => undefined,
    docx,
    composeAttributes: (_modelType, _source, builtIn = {}) => builtIn,
    report: vi.fn()
  };
}

/**
 * Creates one isolated structural mark export context.
 *
 * @param mark - Source canonical mark.
 * @returns Context with identity partial-attribute composition.
 */
function createExportContext(
  mark: QuireMark
): DocxMarkExportContext<QuireMark> {
  return {
    mark,
    path: "document.content[0].marks[0]",
    lossPolicy: "strict",
    resolveService: () => undefined,
    docx,
    composeAttributes: (_litType, _source, builtIn = {}) => builtIn,
    report: vi.fn()
  };
}
