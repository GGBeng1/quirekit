// @vitest-environment happy-dom
import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { WordParagraph } from "@quirekit/classic-paragraph-model";
import { TextSelection } from "@quirekit/pm";
import { afterEach, describe, expect, it } from "vitest";
import { WordStyles } from "../../extension";
import { resolveWordNamedCharacterStyle } from "../../model/character";
import { resolveWordParagraphStyleRegistry } from "../../model/registry";

const editors: QuireEditor[] = [];
/** @returns Isolated real editor with history and style commands. */
function editor() {
  const result = new QuireEditor({ extensions: [StarterKit, WordParagraph, WordStyles],
    content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Hello world" }] }] } });
  editors.push(result); return result;
}
afterEach(() => editors.splice(0).forEach(value => value.destroy()));

describe("named style lifecycle", () => {
  it("creates both linked identities in a single undoable transaction", () => {
    const value = editor();
    expect(value.commands.createWordNamedStyle({ id: "Notice", name: "提示", kind: "linked", basedOn: "Normal", text: { color: "#123456" } })).toBe(true);
    const registry = resolveWordParagraphStyleRegistry(value.state.doc.attrs.wordStyleRegistry);
    expect(registry.styles.Notice?.link).toBe("NoticeChar");
    expect(registry.characterStyles?.NoticeChar).toMatchObject({ link: "Notice", kind: "character", text: { color: "#123456" } });
    expect(value.commands.undo()).toBe(true);
    expect(value.state.doc.attrs.wordStyleRegistry).toBeNull();
  });
  it("applies linked character identity to a partial selection and paragraph identity to the whole paragraph", () => {
    const value = editor();
    value.commands.createWordNamedStyle({ id: "Notice", name: "提示", kind: "linked" });
    value.dispatchTransaction(value.state.pm.tr.setSelection(TextSelection.create(value.state.doc, 2, 5)));
    expect(value.commands.applyWordLinkedStyle({ styleId: "Notice" })).toBe(true);
    expect(value.state.doc.child(0).child(1).marks[0]?.attrs.styleId).toBe("NoticeChar");
    expect(value.state.doc.child(0).attrs.wordParagraph?.styleId).not.toBe("Notice");
    value.dispatchTransaction(value.state.pm.tr.setSelection(TextSelection.create(value.state.doc, 1, 12)));
    expect(value.commands.applyWordLinkedStyle({ styleId: "Notice" })).toBe(true);
    expect(value.state.doc.child(0).attrs.wordParagraph.styleId).toBe("Notice");
    const remaining: string[] = [];
    value.state.doc.child(0).forEach(node => node.marks.forEach(mark => { if (mark.type.name === "wordCharacterStyle") remaining.push(mark.attrs.styleId); }));
    expect(remaining).toEqual([]);
    expect(value.commands.undo()).toBe(true);
    expect(value.state.doc.child(0).child(1).marks[0]?.attrs.styleId).toBe("NoticeChar");
  });
  it("creates and applies a named style within one command chain", () => {
    const value = editor();
    expect(value.chain().createWordNamedStyle({ id: "Chained", name: "连贯样式", kind: "paragraph" })
      .applyWordLinkedStyle({ styleId: "Chained" }).run()).toBe(true);
    expect(value.state.doc.child(0).attrs.wordParagraph.styleId).toBe("Chained");
  });
  it("retains a typing style and updates existing occurrences without flattening marks", () => {
    const value = editor();
    value.commands.createWordNamedStyle({ id: "Emphasis", name: "强调", kind: "character", text: { underline: { style: "double" } } });
    expect(value.commands.applyWordCharacterStyle({ styleId: "Emphasis" })).toBe(true);
    expect(value.state.pm.storedMarks?.[0]?.attrs.styleId).toBe("Emphasis");
    const registry = resolveWordParagraphStyleRegistry(value.state.doc.attrs.wordStyleRegistry);
    expect(value.commands.updateWordCharacterStyle({ style: { ...registry.characterStyles!.Emphasis!, text: { color: "#123456" } } })).toBe(true);
    expect(resolveWordNamedCharacterStyle(resolveWordParagraphStyleRegistry(value.state.doc.attrs.wordStyleRegistry), "Emphasis").text.color).toBe("#123456");
    expect(value.commands.applyWordCharacterStyle({ styleId: null })).toBe(true);
    expect(value.state.pm.storedMarks ?? []).toEqual([]);
  });
  it("rejects type mismatches, invalid metrics, cycles, duplicate ids and readonly edits", () => {
    const value = editor();
    expect(value.commands.createWordNamedStyle({ name: "坏字体", kind: "character", text: { fontScale: -1 } })).toBe(false);
    expect(value.commands.createWordNamedStyle({ name: "坏继承", kind: "character", basedOn: "Normal" })).toBe(false);
    expect(value.commands.createWordNamedStyle({ id: "Normal", name: "重名", kind: "paragraph" })).toBe(false);
    value.commands.createWordNamedStyle({ id: "A", name: "A", kind: "character" });
    value.commands.createWordNamedStyle({ id: "B", name: "B", kind: "character", basedOn: "A" });
    const style = resolveWordParagraphStyleRegistry(value.state.doc.attrs.wordStyleRegistry).characterStyles!.A!;
    expect(value.commands.updateWordCharacterStyle({ style: { ...style, basedOn: "B" } })).toBe(false);
    value.setEditable(false);
    expect(value.commands.applyWordCharacterStyle({ styleId: "A" })).toBe(false);
    expect(value.commands.createWordNamedStyle({ name: "只读", kind: "paragraph" })).toBe(false);
  });
});
