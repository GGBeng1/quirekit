import { createEditor, type QuireEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { ClassicEditorKit } from "../../../extensions";
import type { ClassicEditorLocale, ClassicEditorRenderContext } from "../../../types";
import { renderBuiltinWordCount } from "./render";
import { readClassicWordCountSummarizedNodes } from "./summary";

describe("Classic built-in word count", () => {
  it("reuses summaries for selection updates and preserves both locale counting rules", () => {
    const editor = createCountEditor("你好 🌍 hello world");
    expect(renderBuiltinWordCount(createContext(editor, "zh-CN"))).toBe("13 字");
    const summarized = readClassicWordCountSummarizedNodes();

    for (let position = 1; position <= 10; position += 1) {
      editor.commands.setTextSelection(position);
      expect(renderBuiltinWordCount(createContext(editor, "zh-CN"))).toBe("13 字");
    }
    expect(renderBuiltinWordCount(createContext(editor, "en"))).toBe("4 words");
    expect(renderBuiltinWordCount(createContext(editor, "zh-CN"))).toBe("13 字");
    expect(readClassicWordCountSummarizedNodes()).toBe(summarized);
    editor.destroy();
  });

  it("updates after edits and undo while keeping other editor counts independent", () => {
    const first = createCountEditor("one two");
    const second = createCountEditor("other");
    const firstContext = createContext(first, "en");
    const secondContext = createContext(second, "en");
    expect(renderBuiltinWordCount(firstContext)).toBe("2 words");
    expect(renderBuiltinWordCount(secondContext)).toBe("1 word");

    first.commands.setTextSelection(1);
    first.commands.insertContent("new ");
    expect(renderBuiltinWordCount(firstContext)).toBe("3 words");
    expect(first.commands.undo()).toBe(true);
    expect(renderBuiltinWordCount(firstContext)).toBe("2 words");
    expect(renderBuiltinWordCount(secondContext)).toBe("1 word");
    first.destroy();
    second.destroy();
  });

  it("retains zero counts for an empty document", () => {
    const editor = createCountEditor();
    expect(renderBuiltinWordCount(createContext(editor, "zh-CN"))).toBe("0 字");
    expect(renderBuiltinWordCount(createContext(editor, "en"))).toBe("0 words");
    editor.destroy();
  });
});

/** @param text - Optional paragraph text. @returns A headless status fixture. */
function createCountEditor(text?: string): QuireEditor {
  return createEditor({
    extensions: [ClassicEditorKit],
    content: { type: "doc", content: [{
      type: "paragraph",
      ...(text === undefined ? {} : { content: [{ type: "text", text }] })
    }] }
  });
}

/**
 * Creates the context subset consumed by the word-count contribution.
 * @param editor - Headless document and text-serialization authority.
 * @param locale - Product counting and localization rules.
 * @returns Word-count render context.
 */
function createContext(
  editor: QuireEditor,
  locale: ClassicEditorLocale
): ClassicEditorRenderContext {
  return { editor, locale } as ClassicEditorRenderContext;
}
