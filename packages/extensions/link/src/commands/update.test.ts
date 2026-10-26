// @vitest-environment happy-dom
import { QuireEditor } from "@quirekit/core";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it } from "vitest";
import { Link } from "../link";

/** @returns A link with two differently formatted runs and an adjacent link. */
function fixture(): QuireEditor {
  return new QuireEditor({ extensions: [StarterKit, Link], content: {
    type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "hello", marks: [
        { type: "link", attrs: { href: "https://example.com" } }, { type: "bold" }
      ] },
      { type: "text", text: " world", marks: [
        { type: "link", attrs: { href: "https://example.com" } }, { type: "italic" }
      ] },
      { type: "text", text: "next", marks: [
        { type: "link", attrs: { href: "https://other.example.com" } }
      ] }
    ] }]
  } });
}

describe("updateLink", () => {
  it("inherits active text formatting on insertion without leaking the link", () => {
    const editor = fixture();
    editor.commands.setContent("<p><strong>text</strong></p>");
    editor.commands.setTextSelection(3);
    expect(editor.commands.insertLink({ href: "https://example.com", text: "label" })).toBe(true);
    const label = editor.state.doc.firstChild!.child(1);
    expect(label.marks.map(mark => mark.type.name)).toEqual(expect.arrayContaining(["bold", "link"]));
    editor.commands.insertContent("next");
    const next = editor.state.doc.firstChild!.child(2);
    expect(next.marks.map(mark => mark.type.name)).toEqual(["bold"]);
    editor.commands.setContent("<pre><code>text</code></pre>");
    editor.commands.setTextSelection(3);
    const before = editor.getJSON();
    expect(editor.commands.insertLink({ href: "https://example.com", text: "label" })).toBe(false);
    expect(editor.getJSON()).toEqual(before);
    editor.commands.setContent("<p><code>text</code></p>");
    editor.commands.setTextSelection(3);
    const code = editor.getJSON();
    expect(editor.can().insertLink({ href: "https://example.com", text: "label" })).toBe(false);
    expect(editor.commands.insertLink({ href: "https://example.com", text: "label" })).toBe(false);
    expect(editor.getJSON()).toEqual(code);
    editor.destroy();
  });
  it("retains inline atoms on address-only edits and rejects destructive renaming", () => {
    const editor = fixture();
    editor.commands.setContent({ type: "doc", content: [{ type: "paragraph", content: [
      { type: "text", text: "before", marks: [{ type: "link", attrs: { href: "#target" } }] },
      { type: "hardBreak", marks: [{ type: "link", attrs: { href: "#target" } }] },
      { type: "text", text: "after", marks: [{ type: "link", attrs: { href: "#target" } }] }
    ] }] });
    editor.commands.setTextSelection(3);
    const before = editor.getJSON();
    expect(editor.can().updateLink({ href: "#other", text: "label" })).toBe(false);
    expect(editor.commands.updateLink({ href: "#other", text: "label" })).toBe(false);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.updateLink({ href: "#other" })).toBe(true);
    expect(editor.state.doc.firstChild?.child(1).type.name).toBe("hardBreak");
    editor.destroy();
  });

  it("uses the target as label when explicitly cleared", () => {
    const editor = fixture();
    editor.commands.setTextSelection(3);
    expect(editor.commands.updateLink({ href: "https://new.example.com", text: " " })).toBe(true);
    expect(editor.state.doc.firstChild?.firstChild?.text).toBe("https://new.example.com");
    editor.destroy();
  });

  it("renames the entire active occurrence atomically and keeps first-run formatting", () => {
    const editor = fixture();
    editor.commands.setTextSelection({ from: 3, to: 7 });
    const before = editor.getJSON();
    const payload = { href: "https://example.com/new", text: "文档" };
    expect(editor.can().updateLink(payload)).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.updateLink(payload)).toBe(true);
    const nodes = editor.state.doc.firstChild!;
    expect(nodes.textContent).toBe("文档next");
    expect(nodes.child(0).marks.map(mark => mark.type.name)).toContain("bold");
    expect(nodes.child(0).marks.find(mark => mark.type.name === "link")?.attrs.href)
      .toBe(payload.href);
    expect(nodes.child(1).marks[0]?.attrs.href).toBe("https://other.example.com");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.getJSON()).toEqual(before);
    expect(editor.commands.redo()).toBe(true);
    expect(editor.state.doc.textContent).toBe("文档next");
    editor.destroy();
  });

  it.each([undefined, "hello world"])("preserves all runs when text is %s", text => {
    const editor = fixture();
    editor.commands.setTextSelection(3);
    expect(editor.commands.updateLink({ href: "#_top", ...(text ? { text } : {}) })).toBe(true);
    const nodes = editor.state.doc.firstChild!;
    expect(nodes.childCount).toBe(3);
    expect(nodes.child(0).marks.some(mark => mark.type.name === "bold")).toBe(true);
    expect(nodes.child(1).marks.some(mark => mark.type.name === "italic")).toBe(true);
    expect(nodes.child(1).marks.find(mark => mark.type.name === "link")?.attrs.href).toBe("#_top");
    editor.destroy();
  });

  it("rejects invalid targets, multiline labels and selections across different links", () => {
    const editor = fixture();
    editor.commands.setTextSelection(3);
    const before = editor.getJSON();
    expect(editor.commands.updateLink({ href: "javascript:alert(1)" })).toBe(false);
    expect(editor.commands.updateLink({ href: "#_top", text: "a\nb" })).toBe(false);
    editor.commands.setTextSelection({ from: 3, to: 14 });
    expect(editor.commands.updateLink({ href: "#_top", text: "no" })).toBe(false);
    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });
});
