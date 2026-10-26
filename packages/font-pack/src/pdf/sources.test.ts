import { describe, expect, it, vi } from "vitest";
import { quirePortablePdfFontAssets } from "./assets";
import { createQuirePortablePdfFontSources } from "./sources";

describe("portable PDF font preset", () => {
  it("declares complete static faces with cross-viewer-safe subsetting", () => {
    expect(quirePortablePdfFontAssets).toEqual([
      expect.objectContaining({
        id: "carlito-400-normal",
        family: "Carlito",
        weight: 400,
        style: "normal",
        subset: true
      }),
      expect.objectContaining({
        id: "carlito-400-italic",
        family: "Carlito",
        weight: 400,
        style: "italic",
        subset: true
      }),
      expect.objectContaining({
        id: "carlito-700-normal",
        family: "Carlito",
        weight: 700,
        style: "normal",
        subset: true
      }),
      expect.objectContaining({
        id: "carlito-700-italic",
        family: "Carlito",
        weight: 700,
        style: "italic",
        subset: true
      }),
      expect.objectContaining({
        id: "noto-serif-sc-400-normal",
        family: "Noto Serif SC",
        weight: 400,
        subset: true
      }),
      expect.objectContaining({
        id: "noto-serif-sc-700-normal",
        family: "Noto Serif SC",
        weight: 700,
        subset: true
      }),
      expect.objectContaining({
        id: "noto-sans-hans-400-normal",
        family: "Noto Sans Hans",
        weight: 400,
        subset: true
      }),
      expect.objectContaining({
        id: "noto-sans-hans-700-normal",
        family: "Noto Sans Hans",
        weight: 700,
        subset: true
      }),
      expect.objectContaining({
        id: "noto-sans-symbols-2-400-normal",
        family: "Noto Sans Symbols 2",
        weight: 400,
        style: "normal",
        subset: true,
        unicodeRange: "U+25A0-27BF"
      })
    ]);
  });

  it("keeps loading lazy and exposes accepted logical-family mappings", async () => {
    const loadAsset = vi.fn(() => new Uint8Array([1, 2, 3]));
    const sources = createQuirePortablePdfFontSources({ loadAsset });

    expect(loadAsset).not.toHaveBeenCalled();
    expect(sources).toHaveLength(9);
    expect(sources.find((source) =>
      source.id === "quire-font-pack-carlito-400-normal"
    )).toEqual(expect.objectContaining({
      family: "Carlito",
      acceptedSubstitutions: ["Calibri"],
      features: {
        calt: false,
        clig: false,
        kern: false,
        liga: false,
        rlig: false
      }
    }));
    expect(sources.find((source) =>
      source.id === "quire-font-pack-noto-serif-sc-400-normal"
    )).toEqual(expect.objectContaining({
      family: "Noto Serif SC",
      acceptedSubstitutions: [
        "宋体",
        "SimSun",
        "NSimSun",
        "仿宋",
        "FangSong",
        "FangSong_GB2312"
      ]
    }));
    expect(sources.find((source) =>
      source.id === "quire-font-pack-noto-sans-hans-400-normal"
    )).toEqual(expect.objectContaining({
      family: "Noto Sans Hans",
      acceptedSubstitutions: expect.arrayContaining([
        "微软雅黑",
        "Microsoft YaHei",
        "黑体",
        "SimHei"
      ]),
      fallback: true
    }));
    expect(sources.find((source) =>
      source.id === "quire-font-pack-noto-sans-symbols-2-400-normal"
    )).toEqual(expect.objectContaining({
      family: "Noto Sans Symbols 2",
      acceptedSubstitutions: [
        "MS Gothic",
        "Segoe UI Symbol",
        "Arial Unicode MS"
      ],
      fallback: true,
      unicodeRange: "U+25A0-27BF"
    }));

    const selected = sources[0];
    expect(selected).toBeDefined();
    await selected!.data();
    expect(loadAsset).toHaveBeenCalledTimes(1);
    expect(loadAsset).toHaveBeenCalledWith(quirePortablePdfFontAssets[0]);
  });
});
