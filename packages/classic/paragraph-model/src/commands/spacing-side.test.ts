import { Editor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { expect, it } from "vitest";
import { WordParagraph } from "../extension";
import { defaultWordParagraphFormatting, resolveWordParagraphFormatting } from "../model";

it("changes one side per selected paragraph, keeps distinct siblings, and undoes one intent", () => {
  const editor = new Editor({ extensions: [StarterKit, WordParagraph], content: { type: "doc", content: [100, 175].map(afterLines => ({
    type: "paragraph", attrs: { wordParagraph: { spacing: { ...defaultWordParagraphFormatting.spacing,
      before: { unit: "dxa", value: 240 }, beforeLines: 50, afterLines, afterAutoSpacing: true, line: { rule: "exact", value: afterLines + 240 } } } },
    content: [{ type: "text", text: "Text" }]
  })) } });
  try {
    editor.commands.setTextSelection({ from: 1, to: 10 });
    const before = editor.getJSON();
    expect(editor.can().setWordParagraphSpacingSide({ side: "before", unit: "line", value: 25 })).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.setWordParagraphSpacingSide({ side: "before", unit: "line", value: 25 })).toBe(true);
    const after = editor.getJSON();
    for (const [index, child] of after.content!.entries()) {
      expect(resolveWordParagraphFormatting(child.attrs!.wordParagraph).spacing).toEqual({ ...resolveWordParagraphFormatting(before.content![index]!.attrs!.wordParagraph).spacing,
        before: { unit: "dxa", value: 0 }, beforeLines: 25, beforeAutoSpacing: false });
    }
    expect(editor.commands.setWordParagraphSpacingSide({ side: "after", unit: "dxa", value: 0 })).toBe(true);
    expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(after);
    expect(editor.commands.undo()).toBe(true); expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.redo()).toBe(true); expect(editor.getJSON()).toEqual(after);
    for (const value of [-1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(editor.commands.setWordParagraphSpacingSide({ side: "before", unit: "line", value })).toBe(false);
    }
    expect(editor.getJSON()).toEqual(after);
  } finally { editor.destroy(); }
});
