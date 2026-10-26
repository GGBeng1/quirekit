import { describe, expect, it } from "vitest";
import {
  builtinClassicEditorMessageKeys,
  getBuiltinClassicEditorText,
  resolveBuiltinClassicEditorMessage
} from "./messages";

describe("built-in Classic Editor messages", () => {
  it("defines non-empty Chinese and English copy for every key", () => {
    for (const key of builtinClassicEditorMessageKeys) {
      const text = getBuiltinClassicEditorText(key);
      expect(text["zh-CN"].trim()).not.toBe("");
      expect(text.en.trim()).not.toBe("");
    }
  });

  it("formats named parameters without component-local locale branches", () => {
    expect(resolveBuiltinClassicEditorMessage("zh-CN", "selectedCharacters", {
      count: 4
    })).toBe("已选择 4 个字符");
    expect(resolveBuiltinClassicEditorMessage("en", "selectedCharacters", {
      count: 4
    })).toBe("4 selected");
    expect(resolveBuiltinClassicEditorMessage("zh-CN", "tableCellTarget", {
      rows: 3,
      columns: 4,
      row: 2,
      column: 1
    })).toBe("表格 3 行 × 4 列，第 2 行第 1 列");
    expect(resolveBuiltinClassicEditorMessage("en", "controlTarget", {
      label: "Checkbox"
    })).toBe("Control: Checkbox");
    expect(resolveBuiltinClassicEditorMessage("en", "imageTarget", {
      label: "Cover"
    })).toBe("Image: Cover");
    expect(resolveBuiltinClassicEditorMessage("zh-CN", "moreCommands")).toBe("更多命令");
    expect(resolveBuiltinClassicEditorMessage("en", "moreTasks")).toBe("More tasks");
    expect(resolveBuiltinClassicEditorMessage("zh-CN", "documentImportFailed"))
      .toBe("导入失败，当前文档未更改");
    expect(resolveBuiltinClassicEditorMessage("en", "documentImportFailed"))
      .toBe("Import failed; current document unchanged");
  });

  it("rejects unresolved visible placeholders", () => {
    expect(() => resolveBuiltinClassicEditorMessage("en", "selectedCharacters"))
      .toThrowError(/count/u);
  });
});
