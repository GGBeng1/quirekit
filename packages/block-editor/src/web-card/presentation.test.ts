// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createBlockEditor, type BlockEditorInstance } from "../runtime";
import { applyBlockLink, captureBlockLink } from "../links/commands";

const sessions: BlockEditorInstance[] = [];
const href = "https://example.com/guide";
/** @returns A link surrounded by independently formatted text. */
function setup() {
  const instance = createBlockEditor({ content: `<p><strong>Before </strong><a href="${href}"><em>Article</em></a><strong> after</strong></p>` });
  sessions.push(instance); instance.editor.commands.setTextSelection(10); return instance.editor;
}
afterEach(() => sessions.splice(0).forEach(instance => instance.destroy()));

it("switches URL/title without losing its authored title and supports side-effect-free can and undo", () => {
  const editor = setup(), original = editor.getJSON();
  const target = captureBlockLink(editor)!;
  expect(editor.can().setBlockLinkView(target, "link")).toBe(true);
  expect(editor.getJSON()).toEqual(original);
  expect(editor.commands.setBlockLinkView(target, "link")).toBe(true);
  expect(editor.state.doc.textContent).toBe(`Before ${href} after`);
  expect(editor.commands.setBlockLinkView(captureBlockLink(editor)!, "title")).toBe(true);
  expect(editor.state.doc.textContent).toBe("Before Article after");
  expect(editor.state.doc.firstChild!.child(1).marks.some(mark => mark.type.name === "italic")).toBe(true);
  editor.commands.undo(); expect(editor.state.doc.textContent).toContain(href);
  editor.commands.undo(); expect(editor.getJSON()).toEqual(original);
});

it("splits only the source paragraph for cards and keeps metadata through card, preview and inline views", () => {
  const editor = setup(), original = editor.getJSON();
  expect(editor.commands.setBlockLinkView(captureBlockLink(editor)!, "card")).toBe(true);
  expect(editor.state.doc.childCount).toBe(3);
  expect(editor.state.doc.firstChild!.textContent).toBe("Before ");
  expect(editor.state.doc.lastChild!.textContent).toBe(" after");
  expect(editor.state.doc.lastChild!.firstChild!.marks[0]!.type.name).toBe("bold");
  const pos = editor.state.doc.firstChild!.nodeSize, card = editor.state.doc.nodeAt(pos)!;
  expect(card.attrs).toMatchObject({ url: href, title: "Article", mode: "card" });
  expect(editor.commands.setBlockWebCardView(pos, card, "preview")).toBe(true);
  const preview = editor.state.doc.nodeAt(pos)!;
  expect(preview.attrs.mode).toBe("embed");
  expect(editor.commands.setBlockWebCardView(pos, preview, "title")).toBe(true);
  expect(editor.state.doc.child(1).textContent).toBe("Article");
  expect(editor.state.doc.child(1).firstChild!.marks.find(mark => mark.type.name === "link")!.attrs.web.url).toBe(href);
  editor.commands.undo(); editor.commands.undo(); editor.commands.undo();
  expect(editor.getJSON()).toEqual(original);
});

it("refuses stale, readonly, non-web, non-text and structurally illegal conversion targets", () => {
  const editor = setup(), target = captureBlockLink(editor)!;
  editor.commands.setTextSelection(1);
  expect(editor.commands.setBlockLinkView(target, "card")).toBe(false);
  editor.commands.setTextSelection(10); editor.setEditable(false);
  expect(editor.commands.setBlockLinkView(captureBlockLink(editor)!, "card")).toBe(false);
  editor.setEditable(true);
  for (const html of ['<p><a href="mailto:a@example.com">Mail</a></p>', `<p><a href="${href}">One<br>Two</a></p>`, `<ul><li><p><a href="${href}">Only</a></p></li></ul>`]) {
    editor.commands.setContent(html); editor.commands.setTextSelection(html.startsWith("<ul>") ? 4 : 2);
    const before = editor.getJSON();
    expect(editor.commands.setBlockLinkView(captureBlockLink(editor)!, "card")).toBe(false);
    expect(editor.getJSON()).toEqual(before);
  }
});

it("keeps standalone links and card metadata in columns and JSON/HTML round trips", () => {
  const editor = setup();
  editor.commands.setContent({ type: "doc", content: [{ type: "blockColumns", attrs: { widths: [50, 50] }, content: [
    { type: "blockColumn", content: [{ type: "webCard", attrs: { url: href, title: "Article", description: "Summary", icon: "https://example.com/icon.png", cover: "https://example.com/cover.png", mode: "card", height: 480 } }] },
    { type: "blockColumn", content: [{ type: "paragraph" }] }
  ] }] });
  const card = editor.state.doc.nodeAt(2)!;
  expect(editor.commands.setBlockWebCardView(2, card, "link")).toBe(true);
  const inline = editor.state.doc.nodeAt(3)!.toJSON(), html = editor.getHTML();
  editor.commands.setContent(html); expect(editor.state.doc.nodeAt(3)!.toJSON()).toEqual(inline);
  editor.commands.setTextSelection(5);
  expect(editor.commands.setBlockLinkView(captureBlockLink(editor)!, "preview")).toBe(true);
  expect(editor.state.doc.nodeAt(2)!.attrs).toMatchObject({ description: "Summary", icon: "https://example.com/icon.png", cover: "https://example.com/cover.png", height: 480, mode: "embed" });
  expect(editor.getHTML()).not.toContain("<iframe");
});

it("keeps same-URL metadata on title edits and drops it when the URL changes", () => {
  const editor=setup();editor.commands.setBlockLinkView(captureBlockLink(editor)!, "link");
  expect(applyBlockLink(editor,captureBlockLink(editor)!,href,"Renamed")).toBe(true);
  const mark=editor.state.doc.firstChild!.child(1).marks.find(item=>item.type.name==="link")!;
  expect(mark.attrs.web).toMatchObject({url:href,title:"Renamed"});
  expect(applyBlockLink(editor,captureBlockLink(editor)!,"https://example.org/new","New title")).toBe(true);
  expect(editor.state.doc.firstChild!.child(1).marks.find(item=>item.type.name==="link")!.attrs.web).toBeNull();
});
