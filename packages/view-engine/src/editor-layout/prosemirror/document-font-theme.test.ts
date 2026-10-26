import { describe, expect, it } from "vitest";
import {
  resolveQuireDocumentFontFamily,
  resolveQuireDocumentFontSlot,
  splitQuireDocumentFontRuns
} from "./document-font-theme";
import type { Node as ProseMirrorNode } from "@quirekit/pm";

describe("document font slot itemization", () => {
  it("keeps ASCII spaces with Latin text and CJK punctuation with East Asian text", () => {
    const runs = splitQuireDocumentFontRuns({
      text: "中 QuireKit 、文",
      font: "16px Calibri, 宋体, sans-serif",
      fontSet: {
        latin: "Calibri",
        eastAsia: "宋体",
        fallbacks: ["SimSun", "sans-serif"]
      }
    });

    expect(runs).toEqual([
      {
        from: 0,
        to: 1,
        text: "中",
        slot: "eastAsia",
        font: "16px 宋体, \"Noto Serif SC\", SimSun, sans-serif"
      },
      {
        from: 1,
        to: 11,
        text: " QuireKit ",
        slot: "latin",
        font: "16px Calibri, Carlito, SimSun, sans-serif"
      },
      {
        from: 11,
        to: 13,
        text: "、文",
        slot: "eastAsia",
        font: "16px 宋体, \"Noto Serif SC\", SimSun, sans-serif"
      }
    ]);
  });

  it("classifies basic Latin independently from East Asian Unicode blocks", () => {
    expect(resolveQuireDocumentFontSlot(" ")).toBe("latin");
    expect(resolveQuireDocumentFontSlot("A")).toBe("latin");
    expect(resolveQuireDocumentFontSlot("，")).toBe("eastAsia");
    expect(resolveQuireDocumentFontSlot("漢")).toBe("eastAsia");
    expect(resolveQuireDocumentFontSlot("한")).toBe("eastAsia");
  });

  it("places a document alternate before the host metric substitute", () => {
    const document = {
      attrs: {
        fontTheme: { body: { latin: "Calibri", eastAsia: "宋体" } },
        fontTable: {
          fonts: [{ family: "Calibri", alternates: ["Aptos"] }]
        }
      }
    } as unknown as ProseMirrorNode;

    expect(resolveQuireDocumentFontFamily(
      document,
      '16px "DejaVu Sans", sans-serif'
    )).toBe('Calibri, Aptos, Carlito, 宋体, "Noto Serif SC", "DejaVu Sans", sans-serif');

    expect(splitQuireDocumentFontRuns({
      text: "QuireKit",
      font: '16px Calibri, Carlito, 宋体, "DejaVu Sans", sans-serif',
      fontSet: { latin: "Calibri", eastAsia: "宋体" },
      fontTable: {
        fonts: [{ family: "Calibri", alternates: ["Aptos"] }]
      }
    })[0]?.font).toBe(
      '16px Calibri, Aptos, Carlito, 宋体, "DejaVu Sans", sans-serif'
    );
  });

  it.each([
    ["微软雅黑", "Noto Sans SC"],
    ["楷体", "LXGW WenKai"],
    ["仿宋", "Zhuque Fangsong"]
  ])("keeps %s logical while appending its open rendering candidate", (
    requested,
    substitute
  ) => {
    expect(splitQuireDocumentFontRuns({
      text: "中文",
      font: "16px sans-serif",
      fontSet: { eastAsia: requested }
    })[0]?.font).toBe(`16px ${requested}, "${substitute}", sans-serif`);
  });

  it("inherits the base font when the selected script slot is absent", () => {
    expect(splitQuireDocumentFontRuns({
      text: "中",
      font: "16px BaseCJK, sans-serif",
      fontSet: { latin: "LatinOnly" }
    })[0]?.font).toBe("16px BaseCJK, sans-serif");
  });

  it("forces an explicit RTL run through the complex-script font slot", () => {
    expect(splitQuireDocumentFontRuns({
      text: "ABC中文",
      font: "16px Base, sans-serif",
      fontSet: { latin: "Latin", eastAsia: "CJK", complexScript: "Complex" },
      forceSlot: "complexScript"
    })).toEqual([{
      from: 0,
      to: 5,
      text: "ABC中文",
      slot: "complexScript",
      font: "16px Complex, Base, sans-serif"
    }]);
  });
});
