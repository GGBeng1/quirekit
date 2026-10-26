// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlockEditor } from "../runtime/create";
import type { BlockEditorInstance } from "../runtime/types";
import { blockInsertItems } from "../ui/insert/catalog";
import { localizeBlockEntries, translateBlockText } from "./text";
import { bindBlockHostLocale } from "./host";

const instances: BlockEditorInstance[] = [];
afterEach(() => instances.splice(0).forEach(instance => instance.destroy()));
/** @param locale - Initial interface language. @returns Isolated canonical session. */
function create(locale?: "en" | "zh-CN") {
  const instance = createBlockEditor({ ...(locale ? { locale } : {}), content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "保留中文内容" }] }] } });
  instances.push(instance); return instance;
}

describe("standalone product language", () => {
  it("isolates instances and preserves canonical state, selection and undo across switches", () => {
    const first = create(), second = create("en");
    first.editor.commands.setTextSelection({ from: 1, to: 3 }); first.editor.commands.toggleBold();
    const state = first.editor.state.pm, notifications = vi.fn(), transactions = vi.fn();
    const release = first.onLocaleChange(notifications);
    first.editor.on("transaction", transactions);
    const json = vi.spyOn(first.editor, "getJSON");
    first.setLocale("en"); first.setLocale("en");
    expect(first.editor.state.pm).toBe(state); expect(first.locale).toBe("en"); expect(second.locale).toBe("en");
    first.setLocale("zh-CN"); expect(second.locale).toBe("en");
    expect(notifications).toHaveBeenCalledTimes(2); expect(transactions).not.toHaveBeenCalled(); expect(json).not.toHaveBeenCalled();
    release(); first.setLocale("en"); expect(notifications).toHaveBeenCalledTimes(2);
    expect(first.editor.commands.undo()).toBe(true); expect(first.editor.getText()).toBe("保留中文内容");
  });
  it("releases observers on destruction and restores host-owned presentation", () => {
    const instance = create("en"), listener = vi.fn(), host = document.createElement("div");
    host.lang = "fr"; host.style.setProperty("--qk-block-writing-placeholder", '"custom"');
    const release = bindBlockHostLocale(instance.editor, host);
    expect(host.lang).toBe("en"); expect(host.style.getPropertyValue("--qk-block-writing-placeholder")).toContain("Type /");
    instance.setLocale("zh-CN"); expect(host.lang).toBe("zh-CN");
    release(); expect(host.lang).toBe("fr"); expect(host.style.getPropertyValue("--qk-block-writing-placeholder")).toBe('"custom"');
    instance.onLocaleChange(listener); instance.destroy(); instance.setLocale("en"); expect(listener).not.toHaveBeenCalled();
  });
  it("searches English labels and preserves Chinese canonical content", () => {
    const instance = create("en");
    const result = blockInsertItems(instance.editor, "date", true);
    expect(result.map(item => item.label)).toContain("Date");
    expect(blockInsertItems(instance.editor, "heading 2", true)[0]?.label).toBe("Heading 2");
    expect(instance.editor.getText()).toBe("保留中文内容");
  });
  it("only translates presentation fields and interpolates values without translating authored names", () => {
    const execute = vi.fn(), source = [{ value: "复制", label: "复制", disclosureLabel: "下划线样式", name: "复制", content: { text: "复制" }, execute,
      items: [{ value: "card", label: "卡片视图", reason: "当前位置不支持此视图" }] }];
    const result = localizeBlockEntries("en", source);
    expect(result[0]).toMatchObject({ value: "复制", label: "Copy", name: "复制", content: source[0]!.content, execute });
    expect(result[0]!.content).toBe(source[0]!.content);
    expect(result[0]!.items[0]!.label).toBe("Card view");
    expect(result[0]!.disclosureLabel).toBe("Underline style");
    expect(translateBlockText("en", "查看图片：{name}", { name: "图片" })).toBe("Preview image: 图片");
    expect(translateBlockText("en", "第三方操作")).toBe("第三方操作");
  });
});
