import { describe, expect, it } from "vitest";
import { resolveWordParagraphFormatting } from "./measurement";

describe("word paragraph formatting resolution", () => {
  it("accepts clear tab stops used to remove inherited positions", () => {
    expect(resolveWordParagraphFormatting({
      indentation: {},
      tabs: [{
        position: { unit: "dxa", value: 720 },
        alignment: "clear",
        leader: "none"
      }]
    }).tabs).toEqual([{
      position: { unit: "dxa", value: 720 },
      alignment: "clear",
      leader: "none"
    }]);
  });

  it("retains paragraph styles and explicit false layout switches", () => {
    const formatting = resolveWordParagraphFormatting({
      styleId: "Heading2",
      outlineLevel: 1,
      alignment: "justify",
      direction: "rtl",
      pagination: {
        widowControl: false,
        keepNext: true,
        keepLines: false,
        pageBreakBefore: null
      },
      documentGrid: {
        adjustRightIndent: false,
        snapToGrid: true
      },
      eastAsianLayout: {
        autoSpaceLatin: false,
        autoSpaceNumber: true,
        wordWrap: false,
        kinsoku: true,
        overflowPunctuation: false,
        compressLineStartPunctuation: true
      }
    });

    expect(formatting).toMatchObject({
      styleId: "Heading2",
      outlineLevel: 1,
      alignment: "justify",
      direction: "rtl",
      pagination: {
        widowControl: false,
        keepNext: true,
        keepLines: false,
        pageBreakBefore: null
      },
      documentGrid: {
        adjustRightIndent: false,
        snapToGrid: true
      },
      eastAsianLayout: {
        autoSpaceLatin: false,
        autoSpaceNumber: true,
        wordWrap: false,
        kinsoku: true,
        overflowPunctuation: false,
        compressLineStartPunctuation: true
      }
    });
  });
});
