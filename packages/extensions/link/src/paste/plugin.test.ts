// @vitest-environment happy-dom
import { Node, QuireEditor } from "@quirekit/core";
import { Fragment, Slice, Node as ProseMirrorNode } from "@quirekit/pm";
import { StarterKit } from "@quirekit/starter-kit";
import { describe, expect, it, vi } from "vitest";
import { Link } from "../link";

/** @returns A mounted editor exposing the real clipboard prop chain. */
function fixture(): QuireEditor {
  return new QuireEditor({ extensions: [StarterKit, Link], content: "<p>unchanged</p>" });
}

/** @param editor - Clipboard owner. @param slice - Input slice. @returns Transformed slice. */
function paste(editor: QuireEditor, slice: Slice): Slice {
  let result = slice;
  editor.view.someProp("transformPasted", transform => {
    result = (transform as (slice: Slice, view: unknown, plain: boolean) => Slice)(result, editor.view, true);
    return false;
  });
  return result;
}

describe("Link clipboard transform", () => {
  it("does not rewrite the internal text of an opaque atom", () => {
    const Opaque = Node.create({ name: "opaque", group: "inline", inline: true, atom: true, content: "text*" });
    const editor = new QuireEditor({ extensions: [StarterKit, Link, Opaque], content: "<p>plain</p>" });
    const { schema } = editor.state;
    const atom = schema.nodes.opaque!.create(null, schema.text("https://example.com"));
    const slice = new Slice(Fragment.from(atom), 0, 0);
    expect(paste(editor, slice)).toBe(slice);
    editor.destroy();
  });

  it("does not scan the document or repeatedly cut a many-run clipboard fragment", () => {
    const editor = fixture();
    const { schema } = editor.state;
    const source = Array.from({ length: 100 }, () => [
      schema.text("https://exam", [schema.marks.bold!.create()]), schema.text("ple.com ")
    ]).flat();
    const slice = new Slice(Fragment.fromArray(source), 0, 0);
    const scan = vi.spyOn(editor.state.doc, "descendants");
    const cut = vi.spyOn(ProseMirrorNode.prototype, "cut");
    const result = paste(editor, slice);
    expect(scan).not.toHaveBeenCalled();
    expect(cut.mock.calls.length).toBeLessThanOrEqual(300);
    expect(result.content.childCount).toBe(300);
    cut.mockRestore();
    scan.mockRestore();
    editor.destroy();
  });

  it.each(["javascript:alert(1)", "data:text/html,unsafe", "#anchor", "../path", "javascript:https://example.com", "https://example.com/" + "a".repeat(2050)])(
    "does not autolink unsupported or unsafe input %s", text => {
      const editor = fixture();
      const slice = new Slice(Fragment.from(editor.state.schema.text(text)), 0, 0);
      expect(paste(editor, slice)).toBe(slice);
      editor.destroy();
    }
  );

  it("leaves pasted URLs plain when the receiving caret has a code mark", () => {
    const editor = fixture();
    editor.commands.setTextSelection(3);
    editor.commands.setCode();
    const slice = new Slice(Fragment.from(editor.state.schema.text("https://example.com")), 0, 0);
    expect(paste(editor, slice)).toBe(slice);
    editor.destroy();
  });

  it("recognizes pasted URLs with punctuation without changing text or the document", () => {
    const editor = fixture();
    const text = "文档：https://example.com/a(b)。另见 www.example.com, javascript:alert(1)";
    const before = editor.getJSON();
    const result = paste(editor, new Slice(Fragment.from(editor.state.schema.text(text)), 0, 0));
    const links: string[] = [];
    result.content.forEach(node => { for (const mark of node.marks) links.push(mark.attrs.href); });
    expect(links).toEqual(["https://example.com/a(b)", "https://www.example.com"]);
    expect(result.content.textBetween(0, result.content.size)).toBe(text);
    expect(editor.getJSON()).toEqual(before);
    editor.destroy();
  });

  it("recognizes across formatting runs, retains slice openness and skips existing links/code", () => {
    const editor = fixture();
    const { schema } = editor.state;
    const paragraph = schema.nodes.paragraph!;
    const existing = schema.text("https://example.com", [schema.marks.link!.create({ href: "#kept" })]);
    const slice = new Slice(Fragment.fromArray([
      paragraph.create(null, [
        schema.text("https://exam", [schema.marks.bold!.create()]), schema.text("ple.com")
      ]),
      paragraph.create(null, existing),
      paragraph.create(null, schema.text("https://example.com", [schema.marks.code!.create()])),
      schema.nodes.codeBlock!.create(null, schema.text("https://example.com"))
    ]), 1, 1);
    const result = paste(editor, slice);
    expect(result.openStart).toBe(1);
    expect(result.openEnd).toBe(1);
    expect(result.content.child(0).child(0).marks.some(mark => mark.type.name === "bold")).toBe(true);
    expect(result.content.child(0).child(1).marks[0]?.attrs.href).toBe("https://example.com");
    expect(result.content.child(1)).toBe(slice.content.child(1));
    expect(result.content.child(2)).toBe(slice.content.child(2));
    expect(result.content.child(3)).toBe(slice.content.child(3));
    editor.destroy();
  });
});
