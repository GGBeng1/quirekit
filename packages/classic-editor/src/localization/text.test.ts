import { describe, expect, it } from "vitest";
import {
  defaultClassicEditorLocale,
  defineClassicEditorText,
  resolveClassicEditorText
} from "./text";

describe("Classic Editor localized text", () => {
  it("defaults to Simplified Chinese and resolves English explicitly", () => {
    const text = defineClassicEditorText("撤销", "Undo");

    expect(defaultClassicEditorLocale).toBe("zh-CN");
    expect(resolveClassicEditorText(text)).toBe("撤销");
    expect(resolveClassicEditorText(text, "en")).toBe("Undo");
  });

  it("keeps language-neutral plugin copy compatible", () => {
    expect(resolveClassicEditorText("QuireKit", "zh-CN")).toBe("QuireKit");
    expect(resolveClassicEditorText("QuireKit", "en")).toBe("QuireKit");
  });

  it("rejects incomplete visible copy", () => {
    expect(() => defineClassicEditorText("", "Undo")).toThrow(/Chinese and English/u);
    expect(() => defineClassicEditorText("撤销", " ")).toThrow(/Chinese and English/u);
  });
});
