import { Schema, type Node as ProseMirrorNode } from "@quirekit/pm";
import { qkView } from "@quirekit/renderer";
import { describe, expect, it, vi } from "vitest";
import {
  collectQuireProseMirrorInlineSourceProducts,
  collectQuireProseMirrorInlineSources
} from "./inline";
import { createQuireInlineSourceCapabilityRegistry } from "../../layout/engine/inline/source-capability";

describe("canvas ProseMirror inline text run bridge", () => {
  it("compiles a profile font selector once per run and keeps combining marks and UTF-16 ranges intact", () => {
    const select = vi.fn((character: string) => character === "·" ? "eastAsia" as const : undefined);
    const compile = vi.fn(() => select);
    const sources = collectQuireProseMirrorInlineSources({
      node: createSingleTextChildNode("A·\u0301😀文"), contentStart: 5, contentEnd: 11,
      sourceId: "profile-font-selection", font: "16px serif",
      documentFontSet: { latin: "LatinTest", eastAsia: "CjkTest" }, resolveFontSelection: compile
    });
    expect(sources.textRuns.map(run => [run.text, run.range, run.font])).toEqual([
      ["A", { from: 5, to: 6 }, "16px LatinTest, serif"],
      ["·\u0301", { from: 6, to: 8 }, "16px CjkTest, serif"],
      ["😀", { from: 8, to: 10 }, "16px LatinTest, serif"],
      ["文", { from: 10, to: 11 }, "16px CjkTest, serif"]
    ]);
    expect(compile).toHaveBeenCalledTimes(1);
    expect(select.mock.calls.map(([character]) => character)).toEqual(["A", "·", "😀", "文"]);
  });

  it("projects a schema-defined line break as marked text flow without object anchors", () => {
    const schema = new Schema({ nodes: {
      doc: { content: "paragraph+" },
      paragraph: { content: "inline*" },
      text: { group: "inline" },
      customBreak: { inline: true, group: "inline", linebreakReplacement: true }
    }, marks: { emphasis: {} } });
    const node = schema.node("paragraph", null, [schema.text("A"),
      schema.node("customBreak", null, undefined, [schema.mark("emphasis")]), schema.text("B")]);
    const options = { node, contentStart: 5, contentEnd: 8,
      sourceId: "schema-break", font: "16px serif" };
    const sources = collectQuireProseMirrorInlineSources(options);
    expect(sources.textRuns.map(({ text, range, marks }) => ({ text, range, marks }))).toEqual([
      { text: "A", range: { from: 5, to: 6 }, marks: [] },
      { text: "\n", range: { from: 6, to: 7 }, marks: ["emphasis"] },
      { text: "B", range: { from: 7, to: 8 }, marks: [] }
    ]);
    expect(sources.sourceAnchors).toEqual([]);
    expect(collectQuireProseMirrorInlineSourceProducts(options).sourceAnchors).toEqual([]);
  });

  it("splits one canonical text child into source-contiguous document font slots", () => {
    const sources = collectQuireProseMirrorInlineSources({
      node: createSingleTextChildNode("中 QuireKit 文"),
      contentStart: 5,
      contentEnd: 17,
      sourceId: "paragraph-themed",
      font: "16px Calibri, 宋体, sans-serif",
      documentFontSet: {
        latin: "Calibri",
        eastAsia: "宋体",
        fallbacks: ["SimSun", "sans-serif"]
      }
    });

    expect(sources.textRuns).toEqual([
      {
        text: "中",
        range: { from: 5, to: 6 },
        font: "16px 宋体, \"Noto Serif SC\", SimSun, sans-serif",
        marks: []
      },
      {
        text: " QuireKit ",
        range: { from: 6, to: 16 },
        font: "16px Calibri, Carlito, SimSun, sans-serif",
        marks: []
      },
      {
        text: "文",
        range: { from: 16, to: 17 },
        font: "16px 宋体, \"Noto Serif SC\", SimSun, sans-serif",
        marks: []
      }
    ]);
  });

  it("keeps default geometry candidates when the displayed family is reapplied", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: { fontFamily: { default: null } }
        }
      }
    });
    const plain = schema.node("paragraph", null, [schema.text("18 points")]);
    const direct = schema.node("paragraph", null, [
      schema.text("18 points", [schema.mark("textStyle", { fontFamily: "Calibri" })])
    ]);
    const options = {
      contentStart: 1,
      contentEnd: 10,
      sourceId: "font-idempotence",
      font: "16px Calibri, Carlito, 宋体, serif",
      documentFontSet: {
        latin: "Calibri",
        eastAsia: "宋体",
        fallbacks: ["SimSun", "serif"]
      },
      resolveMarkStyle(mark: import("@quirekit/pm").Mark) {
        return { fontFamily: mark.attrs.fontFamily };
      }
    };

    const plainRuns = collectQuireProseMirrorInlineSources({
      ...options,
      node: plain
    }).textRuns.map(({ text, font }) => ({ text, font }));
    const directRuns = collectQuireProseMirrorInlineSources({
      ...options,
      node: direct
    }).textRuns.map(({ text, font }) => ({ text, font }));

    expect(directRuns).toEqual(plainRuns);
    expect(directRuns).toEqual([
      { text: "18 points", font: "16px Calibri, Carlito, SimSun, serif" }
    ]);
  });

  it("itemizes direct Latin and East Asian mark families before measurement", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: {
            fontFamilyLatin: { default: null },
            fontFamilyEastAsia: { default: null }
          }
        }
      }
    });
    const mark = schema.mark("textStyle", {
      fontFamilyLatin: "LatinDirect",
      fontFamilyEastAsia: "CjkDirect"
    });
    const node = schema.node("paragraph", null, [
      schema.text("中 Latin 文", [mark])
    ]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 5,
      contentEnd: 14,
      sourceId: "paragraph-direct-slots",
      font: "16px LatinTheme, CjkTheme, sans-serif",
      documentFontSet: {
        latin: "LatinTheme",
        eastAsia: "CjkTheme",
        fallbacks: ["sans-serif"]
      },
      resolveMarkStyle(currentMark) {
        return {
          fontFamilyLatin: currentMark.attrs.fontFamilyLatin,
          fontFamilyEastAsia: currentMark.attrs.fontFamilyEastAsia
        };
      }
    });

    expect(sources.textRuns).toEqual([
      {
        text: "中",
        range: { from: 5, to: 6 },
        font: "16px CjkDirect, sans-serif",
        marks: ["textStyle"]
      },
      {
        text: " Latin ",
        range: { from: 6, to: 13 },
        font: "16px LatinDirect, sans-serif",
        marks: ["textStyle"]
      },
      {
        text: "文",
        range: { from: 13, to: 14 },
        font: "16px CjkDirect, sans-serif",
        marks: ["textStyle"]
      }
    ]);
  });

  it("itemizes independent run-language slots without requiring font overrides", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: {
            languageLatin: { default: null },
            languageEastAsia: { default: null },
            languageComplexScript: { default: null }
          }
        }
      }
    });
    const mark = schema.mark("textStyle", {
      languageLatin: "en-US",
      languageEastAsia: "zh-CN",
      languageComplexScript: "ar-SA"
    });
    const node = schema.node("paragraph", null, [
      schema.text("Latin中文مرحبا", [mark])
    ]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 5,
      contentEnd: 17,
      sourceId: "paragraph-language-slots",
      font: "16px sans-serif",
      resolveMarkStyle(currentMark) {
        return {
          languageLatin: currentMark.attrs.languageLatin,
          languageEastAsia: currentMark.attrs.languageEastAsia,
          languageComplexScript: currentMark.attrs.languageComplexScript
        };
      }
    });

    expect(sources.textRuns).toEqual([
      {
        text: "Latin",
        range: { from: 5, to: 10 },
        font: "16px sans-serif",
        language: "en-US",
        marks: ["textStyle"]
      },
      {
        text: "中文",
        range: { from: 10, to: 12 },
        font: "16px sans-serif",
        language: "zh-CN",
        marks: ["textStyle"]
      },
      {
        text: "مرحبا",
        range: { from: 12, to: 17 },
        font: "16px sans-serif",
        language: "ar-SA",
        marks: ["textStyle"]
      }
    ]);
  });

  it("projects explicit run RTL through complex-script font, language, and direction", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: {
            rightToLeft: { default: null },
            fontFamilyComplexScript: { default: null },
            languageComplexScript: { default: null }
          }
        }
      }
    });
    const mark = schema.mark("textStyle", {
      rightToLeft: true,
      fontFamilyComplexScript: "ComplexDirect",
      languageComplexScript: "ar-SA"
    });
    const node = schema.node("paragraph", null, [schema.text("ABC中文", [mark])]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 5,
      contentEnd: 10,
      sourceId: "explicit-run-rtl",
      font: "16px Base, sans-serif",
      documentFontSet: {
        latin: "LatinTheme",
        eastAsia: "CjkTheme",
        complexScript: "ComplexTheme"
      },
      resolveMarkStyle(currentMark) {
        return {
          rightToLeft: currentMark.attrs.rightToLeft,
          fontFamilyComplexScript: currentMark.attrs.fontFamilyComplexScript,
          languageComplexScript: currentMark.attrs.languageComplexScript
        };
      }
    });

    expect(sources.textRuns).toEqual([{
      text: "ABC中文",
      range: { from: 5, to: 10 },
      font: "16px ComplexDirect, Base, sans-serif",
      language: "ar-SA",
      direction: "rtl",
      marks: ["textStyle"]
    }]);
  });

  it("collects one unmarked text child without visiting child callbacks", () => {
    const node = createSingleTextChildNode("Plain text");

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 5,
      contentEnd: 15,
      sourceId: "paragraph-1",
      font: "10px sans-serif",
      nodeStyle: {
        fontWeight: "bold",
        fontScale: 2,
        fontFamily: "DejaVu Serif"
      }
    });

    expect(sources).toEqual({
      textRuns: [
        {
          text: "Plain text",
          range: { from: 5, to: 15 },
          font: "bold 20px \"DejaVu Serif\"",
          marks: []
        }
      ],
      sourceAnchors: [],
      sourceCapabilities: []
    });
  });

  it("inherits absolute node typography on the unmarked fast path", () => {
    const sources = collectQuireProseMirrorInlineSources({ node: createSingleTextChildNode("Plain text"), contentStart: 5, contentEnd: 15,
      sourceId: "paragraph-color", font: "16px sans-serif", nodeStyle: { fontSize: "18pt", fontScale: 2, color: "#345678" } });
    expect(sources.textRuns[0]).toMatchObject({ font: "24px sans-serif", color: "#345678", range: { from: 5, to: 15 } });
  });

  it("projects Word case styles before shaping without changing source ranges", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: {
            allCaps: { default: null },
            smallCaps: { default: null }
          }
        }
      }
    });
    const allCaps = schema.mark("textStyle", { allCaps: true });
    const smallCaps = schema.mark("textStyle", { smallCaps: true });
    const node = schema.node("paragraph", null, [
      schema.text("Abß", [allCaps]),
      schema.text("Cd", [smallCaps])
    ]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 10,
      contentEnd: 15,
      sourceId: "word-case-styles",
      font: "12px Test",
      resolveMarkStyle(mark) {
        return mark.attrs.allCaps === true
          ? { textTransform: "uppercase" }
          : { fontVariantCaps: "small-caps" };
      }
    });

    expect(sources.textRuns).toEqual([
      {
        text: "ABß",
        range: { from: 10, to: 13 },
        font: "12px Test",
        marks: ["textStyle"]
      },
      {
        text: "Cd",
        range: { from: 13, to: 15 },
        font: "small-caps 12px Test",
        marks: ["textStyle"]
      }
    ]);
  });

  it("projects explicit legacy glyph effects without changing source ranges", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: {
            outline: { default: null },
            shadow: { default: null },
            emboss: { default: null },
            imprint: { default: null }
          }
        }
      }
    });
    const mark = schema.mark("textStyle", {
      outline: true,
      shadow: false,
      emboss: true,
      imprint: true
    });
    const node = schema.node("paragraph", null, [schema.text("A中ب", [mark])]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 10,
      contentEnd: 13,
      sourceId: "legacy-glyph-effects",
      font: "16px Test",
      resolveMarkStyle() {
        return { glyphEffects: ["outline", "emboss", "imprint"] };
      }
    });

    expect(sources.textRuns).toEqual([{
      text: "A中ب",
      range: { from: 10, to: 13 },
      font: "16px Test",
      glyphEffects: ["outline", "emboss", "imprint"],
      marks: ["textStyle"]
    }]);
  });

  it("projects hidden text into the selected layout view mode", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: { attrs: { hidden: { default: null } } }
      }
    });
    const hiddenMark = schema.mark("textStyle", { hidden: true });
    const node = schema.node("paragraph", null, [
      schema.text("secret", [hiddenMark])
    ]);
    const base = {
      node,
      contentStart: 4,
      contentEnd: 10,
      sourceId: "hidden-text",
      font: "16px Test",
      resolveMarkStyle(mark: import("@quirekit/pm").Mark) {
        return { hidden: mark.attrs.hidden };
      }
    };

    expect(collectQuireProseMirrorInlineSources({
      ...base,
      hiddenTextViewMode: "normal"
    }).textRuns).toEqual([expect.objectContaining({ hiddenText: "collapsed" })]);
    expect(collectQuireProseMirrorInlineSources({
      ...base,
      hiddenTextViewMode: "formatting-inspection"
    }).textRuns).toEqual([expect.objectContaining({ hiddenText: "inspection" })]);
  });

  it("itemizes complex-script text and applies Word bCs/iCs only to that slot", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" }
      },
      marks: {
        textStyle: {
          attrs: {
            boldCs: { default: null },
            italicCs: { default: null },
            fontSizeComplexScript: { default: null }
          }
        }
      }
    });
    const mark = schema.mark("textStyle", {
      boldCs: true,
      italicCs: true,
      fontSizeComplexScript: "18pt"
    });
    const node = schema.node("paragraph", null, [
      schema.text("Latin مرحبا 中文", [mark])
    ]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 4,
      contentEnd: 18,
      sourceId: "word-complex-script-emphasis",
      font: "12px Base",
      documentFontSet: {
        latin: "LatinFont",
        eastAsia: "CjkFont",
        complexScript: "ArabicFont"
      },
      resolveMarkStyle(currentMark) {
        return {
          fontWeightComplexScript: currentMark.attrs.boldCs === true
            ? "bold"
            : "normal",
          fontStyleComplexScript: currentMark.attrs.italicCs === true
            ? "italic"
            : "normal",
          fontSizeComplexScript: currentMark.attrs.fontSizeComplexScript
        };
      }
    });

    expect(sources.textRuns.map(({ text, font }) => ({ text, font })))
      .toEqual([
        { text: "Latin ", font: "12px LatinFont, Base" },
        { text: "مرحبا", font: "italic bold 24px ArabicFont, Base" },
        { text: " ", font: "12px LatinFont, Base" },
        { text: "中文", font: "12px CjkFont, Base" }
      ]);
  });

  it("retains non-text inline nodes as unresolved logical source anchors", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" },
        attachment: { group: "inline", inline: true, atom: true }
      }
    });
    const node = schema.node("paragraph", null, [
      schema.text("before"),
      schema.node("attachment"),
      schema.text("after")
    ]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 10,
      contentEnd: 22,
      sourceId: "paragraph-attachment",
      font: "10px sans-serif"
    });

    expect(sources.textRuns.map((run) => run.range)).toEqual([
      { from: 10, to: 16 },
      { from: 17, to: 22 }
    ]);
    expect(sources.sourceAnchors).toEqual([
      {
        id: "paragraph-attachment:inline-source:6:attachment",
        nodeType: "attachment",
        range: { from: 16, to: 17 },
        position: { pos: 16, bias: 1 },
        affinity: "before"
      }
    ]);
    expect(sources.sourceCapabilities).toEqual([]);
    expect(collectQuireProseMirrorInlineSourceProducts({
      node,
      contentStart: 10,
      contentEnd: 22,
      sourceId: "paragraph-attachment"
    })).toEqual({
      sourceAnchors: sources.sourceAnchors,
      sourceCapabilities: []
    });
  });

  it("recurses transparent inline containers without collapsing their children", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" },
        inlineControl: {
          group: "inline",
          inline: true,
          content: "inline*"
        },
        permissionStart: {
          group: "inline",
          inline: true,
          atom: true
        }
      }
    });
    const node = schema.node("paragraph", null, [
      schema.text("A"),
      schema.node("inlineControl", null, [
        schema.text("B"),
        schema.node("permissionStart"),
        schema.text("C")
      ]),
      schema.text("D")
    ]);

    const sources = collectQuireProseMirrorInlineSources({
      node,
      contentStart: 10,
      contentEnd: 17,
      sourceId: "paragraph-inline-control",
      font: "10px sans-serif"
    });

    expect(sources.textRuns.map(({ text, range }) => ({ text, range }))).toEqual([
      { text: "A", range: { from: 10, to: 11 } },
      { text: "B", range: { from: 12, to: 13 } },
      { text: "C", range: { from: 14, to: 15 } },
      { text: "D", range: { from: 16, to: 17 } }
    ]);
    expect(sources.sourceAnchors).toEqual([{
      id: "paragraph-inline-control:inline-source:3:permissionStart",
      nodeType: "permissionStart",
      range: { from: 13, to: 14 },
      position: { pos: 13, bias: 1 },
      affinity: "before"
    }]);
    expect(collectQuireProseMirrorInlineSourceProducts({
      node,
      contentStart: 10,
      contentEnd: 17,
      sourceId: "paragraph-inline-control"
    })).toEqual({
      sourceAnchors: sources.sourceAnchors,
      sourceCapabilities: []
    });
  });

  it("compiles claimed inline nodes and retains typed capability gaps", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" },
        attachment: {
          group: "inline",
          inline: true,
          atom: true,
          attrs: { objectId: {} }
        }
      }
    });
    const registry = createQuireInlineSourceCapabilityRegistry([{
      nodeType: "attachment",
      resolve(input) {
        return input.attrs.objectId === "valid"
          ? {
              status: "resolved",
              placement: {
                objectId: "valid",
                extent: { inlineSize: 40, blockSize: 20 },
                layoutMode: "anchored",
                anchorMovement: "move-with-text",
                inlinePlacement: { kind: "offset", reference: "anchor", offset: 0 },
                blockPlacement: { kind: "offset", reference: "line", offset: 0 },
                flowExclusion: { kind: "none" },
                paintOrder: "above-content",
                stackingOrder: 0,
                allowOverlap: true,
                constrainToRegion: true,
                lockAspectRatio: false,
                storyId: null
              },
              presentation: {
                view: qkView.surface({ id: "attachment", width: 40, height: 20 }),
                rootKind: "embed",
                semanticRole: "embed",
                search: { kind: "excluded", reason: "Attachment fixture is not searchable." },
                exportFallbacks: [{ kind: "semantic-degraded" }]
              }
            }
          : {
              status: "gap",
              gaps: [{
                code: "invalid-source-declaration",
                nodeType: input.nodeType,
                message: "Attachment objectId is invalid."
              }]
            };
      }
    }]);

    const resolved = collectQuireProseMirrorInlineSourceProducts({
      node: schema.node("paragraph", null, [
        schema.node("attachment", { objectId: "valid" })
      ]),
      contentStart: 4,
      contentEnd: 5,
      sourceId: "resolved",
      sourceCapabilityRegistry: registry
    });
    const gap = collectQuireProseMirrorInlineSourceProducts({
      node: schema.node("paragraph", null, [
        schema.node("attachment", { objectId: "invalid" })
      ]),
      contentStart: 8,
      contentEnd: 9,
      sourceId: "gap",
      sourceCapabilityRegistry: registry
    });

    expect(resolved.sourceAnchors[0]).toMatchObject({
      id: "resolved:inline-source:0:attachment",
      nodeType: "attachment"
    });
    expect(resolved.sourceCapabilities[0]).toMatchObject({
      sourceAnchorId: "resolved:inline-source:0:attachment",
      status: "resolved",
      placement: { objectId: "valid" }
    });
    expect(gap.sourceAnchors[0]).toMatchObject({
      id: "gap:inline-source:0:attachment",
      nodeType: "attachment"
    });
    expect(gap.sourceCapabilities[0]).toMatchObject({
      sourceAnchorId: "gap:inline-source:0:attachment",
      status: "gap",
      gaps: [{ code: "invalid-source-declaration" }]
    });
  });

  it("inserts a measured replacement run for an inline drawing capability", () => {
    const schema = new Schema({
      nodes: {
        doc: { content: "paragraph+" },
        paragraph: { content: "inline*" },
        text: { group: "inline" },
        drawing: { group: "inline", inline: true, atom: true }
      }
    });
    const registry = createQuireInlineSourceCapabilityRegistry([{
      nodeType: "drawing",
      resolve() {
        return {
          status: "resolved" as const,
          placement: {
            objectId: "inline-drawing",
            extent: { inlineSize: 48, blockSize: 32 },
            layoutMode: "inline" as const,
            anchorMovement: "move-with-text" as const,
            inlinePlacement: { kind: "offset" as const, reference: "anchor" as const, offset: 0 },
            blockPlacement: { kind: "offset" as const, reference: "line" as const, offset: 0 },
            flowExclusion: { kind: "none" as const },
            paintOrder: "above-content" as const,
            stackingOrder: 0,
            allowOverlap: true,
            constrainToRegion: true,
            lockAspectRatio: false,
            storyId: null
          },
          presentation: {
            view: qkView.surface({ id: "inline-drawing", width: 48, height: 32 }),
            rootKind: "embed" as const,
            semanticRole: "embed" as const,
            search: { kind: "excluded" as const, reason: "Drawing fixture." },
            exportFallbacks: [{ kind: "semantic-degraded" as const }]
          }
        };
      }
    }]);
    const sources = collectQuireProseMirrorInlineSources({
      node: schema.node("paragraph", null, [
        schema.text("before"),
        schema.node("drawing"),
        schema.text("after")
      ]),
      contentStart: 10,
      contentEnd: 22,
      sourceId: "paragraph-inline-drawing",
      font: "16px sans-serif",
      sourceCapabilityRegistry: registry
    });

    expect(sources.textRuns).toHaveLength(3);
    expect(sources.textRuns[1]).toEqual({
      text: "\ufffc",
      range: { from: 16, to: 17 },
      font: "16px sans-serif",
      marks: [],
      replacement: {
        sourceAnchorId: "paragraph-inline-drawing:inline-source:6:drawing",
        inlineSize: 48,
        blockSize: 32
      }
    });
  });
});

/**
 * Creates a minimal PM-like textblock whose visitor path fails the test.
 *
 * @param text - Text content for the single child.
 * @returns ProseMirror node double exposing only the fast-path fields.
 */
function createSingleTextChildNode(text: string): ProseMirrorNode {
  const child = {
    isText: true,
    text,
    nodeSize: text.length,
    marks: []
  };

  return {
    childCount: 1,
    child(index: number) {
      if (index !== 0) {
        throw new RangeError(`Unexpected child index ${index}`);
      }

      return child;
    },
    forEach() {
      throw new Error("The single unmarked text fast path should not call forEach.");
    }
  } as unknown as ProseMirrorNode;
}
