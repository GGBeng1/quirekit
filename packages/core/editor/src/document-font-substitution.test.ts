import { describe, expect, it } from "vitest";
import {
  normalizeQuireDocumentFontTable,
  resolveQuireFontSubstitutionCandidates
} from "./document-font-substitution";
import { quireDefaultDocumentFontTheme } from "./document-font-theme";

describe("document font substitution", () => {
  it("uses an open Simplified Chinese family for fresh documents", () => {
    expect(quireDefaultDocumentFontTheme).toEqual({
      body: {
        latin: "Calibri",
        eastAsia: "Noto Serif SC",
        complexScript: "Calibri",
        fallbacks: ["Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      heading: {
        latin: "Calibri",
        eastAsia: "Noto Serif SC",
        complexScript: "Calibri",
        fallbacks: ["Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    });
  });

  it("normalizes case-insensitive font entries and ordered alternates", () => {
    expect(normalizeQuireDocumentFontTable({
      fonts: [
        { family: " Calibri ", alternates: [" Carlito ", "", "CARLITO"] },
        { family: "calibri", alternates: ["Ignored duplicate"] },
        { family: "宋体" },
        { family: "" }
      ]
    })).toEqual({
      fonts: [
        { family: "Calibri", alternates: ["Carlito"] },
        { family: "宋体" }
      ]
    });
  });

  it("orders the requested family, document alternates, and host substitutes", () => {
    const fontTable = normalizeQuireDocumentFontTable({
      fonts: [{ family: "Calibri", alternates: ["Aptos", "Carlito"] }]
    });

    expect(resolveQuireFontSubstitutionCandidates({
      requestedFamily: "calibri",
      fontTable,
      rules: [{ requestedFamily: "Calibri", substitutes: ["Carlito", "Arial"] }]
    })).toEqual([
      { family: "calibri", source: "requested" },
      { family: "Aptos", source: "document-alternate" },
      { family: "Carlito", source: "document-alternate" },
      { family: "Arial", source: "metric-compatible" }
    ]);
  });

  it("uses the asset-free Calibri-compatible rule by default", () => {
    expect(resolveQuireFontSubstitutionCandidates({
      requestedFamily: "Calibri"
    })).toEqual([
      { family: "Calibri", source: "requested" },
      { family: "Carlito", source: "metric-compatible" }
    ]);
  });

  it.each([
    ["宋体", "Noto Serif SC"],
    ["SimSun", "Noto Serif SC"],
    ["方正小标宋简体", "Noto Serif SC"],
    ["微软雅黑", "Noto Sans SC"],
    ["Microsoft YaHei", "Noto Sans SC"],
    ["楷体", "LXGW WenKai"],
    ["KaiTi_GB2312", "LXGW WenKai"],
    ["仿宋", "Zhuque Fangsong"],
    ["FangSong_GB2312", "Zhuque Fangsong"]
  ])("appends the approved open substitute for %s", (requested, substitute) => {
    expect(resolveQuireFontSubstitutionCandidates({
      requestedFamily: requested
    })).toEqual([
      { family: requested, source: "requested" },
      { family: substitute, source: "metric-compatible" }
    ]);
  });

  it("rejects empty requests instead of inventing a logical font", () => {
    expect(resolveQuireFontSubstitutionCandidates({
      requestedFamily: "  "
    })).toEqual([]);
  });
});
