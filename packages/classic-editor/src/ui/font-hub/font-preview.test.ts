import { describe, expect, it } from "vitest";
import type { ClassicEditorWebFontFamily } from "@classic/types";
import {
  isClassicFontScriptFilterId,
  resolveClassicFontPreviewFamily,
  resolveClassicFontPreviewText,
  resolveClassicFontScriptFilterOptions,
  resolveClassicFontScriptFilterSubsets,
  resolveClassicFontScriptLabels
} from "./font-preview";

const family: ClassicEditorWebFontFamily = {
  family: "Fixture CJK",
  sourceId: "fixture",
  sourceLabel: "Fixture",
  subsets: ["chinese-simplified", "latin", "cyrillic"],
  license: { name: "Fixture", url: "https://example.test/license" }
};

describe("Classic font preview presentation", () => {
  it("discloses scripts and chooses a matching representative sample", () => {
    expect(resolveClassicFontScriptLabels(family, "zh-CN")).toEqual([
      "简体中文",
      "拉丁",
      "西里尔"
    ]);
    expect(resolveClassicFontScriptLabels(family, "en")).toEqual([
      "Simplified Chinese",
      "Latin",
      "Cyrillic"
    ]);
    expect(resolveClassicFontPreviewText(family)).toContain("永字八法");
    expect(resolveClassicFontPreviewFamily({ ...family, family: "Fixture Display 1" }))
      .toBe("\"Fixture Display 1\"");
  });

  it("labels absent provider coverage without pretending it is Latin", () => {
    const unknown = { ...family, subsets: undefined };
    expect(resolveClassicFontScriptLabels(unknown, "zh-CN")).toEqual(["语种未知"]);
    expect(resolveClassicFontPreviewText(unknown)).toContain("Font preview");
  });

  it("shares localized language filters with provider subset aliases", () => {
    expect(resolveClassicFontScriptFilterOptions("zh-CN")).toContainEqual({
      label: "中文",
      value: "chinese"
    });
    expect(resolveClassicFontScriptFilterOptions("zh-CN")).toContainEqual({
      label: "简体中文",
      value: "simplified-chinese"
    });
    expect(resolveClassicFontScriptFilterSubsets("simplified-chinese"))
      .toEqual(["chinese-simplified", "simplified-chinese", "sc"]);
    expect(resolveClassicFontScriptFilterSubsets("all")).toEqual([]);
    expect(resolveClassicFontScriptFilterSubsets("chinese")).toContain("cjk");
    expect(isClassicFontScriptFilterId("latin")).toBe(true);
    expect(isClassicFontScriptFilterId("not-a-script")).toBe(false);
  });
});
