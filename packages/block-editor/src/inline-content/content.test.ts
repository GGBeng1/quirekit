import { afterEach, expect, it } from "vitest";
import { createBlockEditor } from "../runtime/create";
import { validInlineDate } from "./value";
import { openInlineContent, openSelectedInlineDate, registerInlineContentHost } from "./tasks";
import type { InlineContentRequest } from "./types";
import { acceptBlockSlash } from "../ui/insert/execute";
import { blockInsertItems } from "../ui/insert/catalog";
const sessions: ReturnType<typeof createBlockEditor>[] = [];
afterEach(() => sessions.splice(0).forEach(s => s.destroy()));
it("validates civil dates and keeps cancelled, stale or readonly drafts out of history", () => {
  expect(validInlineDate("2024-02-29")).toBe(true);
  for (const value of ["2025-02-29", "2026-04-31", "0000-01-01", "2026-10-22T00:00:00Z"]) expect(validInlineDate(value)).toBe(false);
  const session = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph" }] } }); sessions.push(session);
  const editor = session.editor; editor.commands.setTextSelection(1);
  let request: InlineContentRequest | undefined;
  const release = registerInlineContentHost(editor, value => { request = value; });
  const before = editor.state.doc;
  expect(openInlineContent(editor, "date")).toBe(true); expect(editor.state.doc).toBe(before);
  expect(editor.commands.applyBlockInlineContent(request!, "2026-10-30")).toBe(true);
  expect(editor.state.doc.firstChild!.firstChild!.attrs.date).toBe("2026-10-30");
  expect(editor.commands.applyBlockInlineContent(request!, "2026-11-01")).toBe(false);
  editor.commands.undo(); expect(editor.state.doc.textContent).toBe("");
  openInlineContent(editor, "emoji"); expect(editor.commands.applyBlockInlineContent(request!, "✅")).toBe(true); expect(editor.state.doc.textContent).toBe("✅");
  openInlineContent(editor, "date"); editor.setEditable(false); expect(editor.commands.applyBlockInlineContent(request!, "2026-10-30")).toBe(false);
  release();
});
it("uses the same catalog and atomic slash replacement for all body content", () => {
  const session = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "/" }] }] } }); sessions.push(session);
  const editor = session.editor;
  expect(blockInsertItems(editor, "", true).map(item => item.id)).toEqual(expect.arrayContaining(["inlineDate", "emoji", "footnoteReference", "definitionList"]));
  expect(acceptBlockSlash(editor, { doc: editor.state.doc, from: 0, to: 3, text: "/" }, "footnoteReference")).toBe(true);
  expect(editor.state.doc.firstChild!.firstChild!.type.name).toBe("footnoteReference");
  expect(editor.state.doc.textContent).not.toContain("/");
  editor.commands.undo(); expect(editor.state.doc.firstChild!.textContent).toBe("/");
});

it("opens the exact selected date without changing source and releases the host", () => {
  const session = createBlockEditor({ content: { type: "doc", content: [{ type: "paragraph", content: [
    { type: "inlineDate", attrs: { date: "2026-10-30" } }, { type: "text", text: " then " }, { type: "inlineDate", attrs: { date: "2026-11-02" } }
  ] }] } }); sessions.push(session);
  const editor = session.editor, before = editor.state.doc;
  let request: InlineContentRequest | undefined;
  const release = registerInlineContentHost(editor, value => { request = value; });
  editor.commands.setTextSelection(2);
  expect(openSelectedInlineDate(editor)).toBe(false); expect(request).toBeUndefined();
  editor.commands.setNodeSelection(8);
  expect(openSelectedInlineDate(editor)).toBe(true);
  expect(request).toMatchObject({ position: 8, range: { from: 8, to: 9 }, value: "2026-11-02" });
  expect(editor.state.doc).toBe(before);
  editor.setEditable(false); expect(openSelectedInlineDate(editor)).toBe(false);
  editor.setEditable(true); release(); expect(openSelectedInlineDate(editor)).toBe(false);
});
