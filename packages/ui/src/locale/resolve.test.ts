import { describe, expect, it } from "vitest";
import { defineQuireKitLocale, quireKitEn, quireKitZhCN, resolveQuireKitLocale } from "./index";

describe("resolveQuireKitLocale", () => {
  it("matches the exact tag, then the base language, then Chinese, keeping the requested tag", () => {
    expect(resolveQuireKitLocale("en").messages).toBe(quireKitEn.messages);
    const regional = resolveQuireKitLocale("en-GB");
    expect(regional.code).toBe("en-GB");
    expect(regional.messages).toBe(quireKitEn.messages);
    expect(resolveQuireKitLocale("xx").messages).toBe(quireKitZhCN.messages);
  });

  it("layers a partial added pack over its fallback one component at a time", () => {
    const japanese = defineQuireKitLocale({ code: "ja", messages: { jsonViewer: { tree: "ツリー" } } });
    const resolved = resolveQuireKitLocale("ja-JP", [japanese]);
    expect(resolved.messages.jsonViewer.tree).toBe("ツリー");
    expect(resolved.messages.jsonViewer.source).toBe("Source");
    expect(resolved.messages.fileUpload).toEqual(quireKitEn.messages.fileUpload);
    const overChinese = resolveQuireKitLocale("ja", [{ ...japanese, fallback: "zh-CN" }]);
    expect(overChinese.messages.jsonViewer.source).toBe("原文");
  });

  it("lets an added pack adjust a built-in language and survives fallback cycles", () => {
    const adjusted = resolveQuireKitLocale("en", [{ code: "en", fallback: "en", messages: { fileUpload: { choose: "Browse" } } }]);
    expect(adjusted.messages.fileUpload.choose).toBe("Browse");
    expect(adjusted.messages.fileUpload.clearAll).toBe("Clear all");
  });
});
