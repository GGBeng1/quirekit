import { describe, expect, it } from "vitest";
import { createBlockEditor } from "../../index";
import { readBlockFormatting } from "./format";
import { readBlockOutline, updateBlockOutline } from "./outline";

describe("Block product projection work bounds", () => {
  it("reports mixed marks once and inspects only the selected inline fragments", () => {
    const instance = createBlockEditor({ content: {
      type: "doc", content: [{ type: "paragraph", content: [
        { type: "text", text: "One ", marks: [{ type: "bold" }, { type: "textStyle", attrs: { fontFamily: "serif" } }] },
        { type: "text", text: "two three", marks: [{ type: "textStyle", attrs: { fontFamily: "monospace" } }] }
      ] }]
    } });
    instance.editor.commands.setTextSelection({ from: 1, to: 8 });
    expect(readBlockFormatting(instance.editor.state.pm).marks.bold).toBe("mixed");
    expect(readBlockFormatting(instance.editor.state.pm).font).toBeNull();
    instance.editor.commands.setTextSelection({ from: 6, to: 8 });
    expect(readBlockFormatting(instance.editor.state.pm)).toMatchObject({ marks: { bold: false }, font: "monospace", visited: 2, truncated: false });
    instance.destroy();
  });

  it("bounds select-all work and resolves a late caret without preceding-block scans", () => {
    const instance = createBlockEditor({ content: {
      type: "doc", content: Array.from({ length: 1500 }, () => ({ type: "paragraph", content: [{ type: "text", text: "Text" }] }))
    } });
    instance.editor.commands.selectAll();
    expect(readBlockFormatting(instance.editor.state.pm)).toMatchObject({ visited: 256, truncated: true, font: null, size: null, marks: { bold: "mixed" } });
    let reads = 0;
    const paragraphs = {
      /** @returns A fixed neutral field projection to count semantic reads. */
      read() { reads++; return { alignment: "start", start: 0, end: 0, firstLine: 0, line: null, before: null, after: null }; }
    };
    expect(readBlockFormatting(instance.editor.state.pm, 256, null, paragraphs)).toMatchObject({ visited: 256, truncated: true, paragraph: { alignment: null } });
    expect(reads).toBeLessThanOrEqual(128);
    instance.editor.commands.setTextSelection(instance.editor.state.doc.content.size - 2);
    expect(readBlockFormatting(instance.editor.state.pm)).toMatchObject({ visited: 0, truncated: false });
    reads = 0;
    expect(readBlockFormatting(instance.editor.state.pm, 256, null, paragraphs).paragraph?.alignment).toBe("start");
    expect(reads).toBe(1);
    instance.destroy();
  });

  it("maps and updates headings through inserts, edits and block conversions", () => {
    const instance = createBlockEditor({ content: {
      type: "doc", content: [
        { type: "paragraph", content: [{ type: "text", text: "Intro" }] },
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Section" }] },
        { type: "paragraph" }
      ]
    } });
    const editor = instance.editor;
    let outline = readBlockOutline(editor.state.doc);
    editor.on("transaction", ({ transaction, appendedTransactions }) => {
      for (const tr of [transaction, ...appendedTransactions]) outline = updateBlockOutline(outline, tr);
    });
    const first = outline;
    editor.commands.setTextSelection(2);
    expect(outline).toBe(first);
    editor.commands.insertContent("longer ");
    expect(outline).toEqual(readBlockOutline(editor.state.doc));
    editor.commands.setTextSelection(outline[0]!.pos + 1);
    editor.commands.insertContent("New ");
    expect(outline).toEqual(readBlockOutline(editor.state.doc));
    editor.commands.setNode("paragraph");
    expect(outline).toEqual([]);
    editor.commands.setHeading({ level: 3 });
    expect(outline).toEqual(readBlockOutline(editor.state.doc));
    instance.destroy();
  });
});
