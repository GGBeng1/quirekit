// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { EditorSelection } from "@quirekit/cm-state";
import { createMsfeEditor, type ComponentViewRenderer, type MsfeEditor } from "@quirekit/msfe-core";
import { Frontmatter } from "../frontmatter/frontmatter";
import { DocumentProperties } from "./extension";
import { documentPropertiesEnabled, setDocumentPropertiesEnabled } from "./state";
import type { DocumentPropertiesProps } from "./types";

let editor: MsfeEditor | undefined;
afterEach(() => { editor?.destroy(); editor = undefined; document.body.replaceChildren(); });
const source = '---\ntitle: Original\nready: false\n---\n\nBody';

/** @param enabled - Initial explicit preference. @param defaultCollapsed - Initial panel state for each document. @returns Mounted public editor and captured renderer inputs. */
function fixture(enabled = true, defaultCollapsed = false) {
  let props: DocumentPropertiesProps | undefined, updates = 0;
  const render: ComponentViewRenderer<DocumentPropertiesProps> = mount => {
    props = mount.props; updates++; mount.dom.textContent = "Properties";
    return { update(value) { props = value; updates++; }, destroy() {} };
  };
  const parent = document.body.appendChild(document.createElement("div"));
  editor = createMsfeEditor({ parent, markdown: source, mode: "live", extensions: [Frontmatter, DocumentProperties.configure({ enabled, defaultCollapsed, render })] });
  return { editor, current: () => props!, updates: () => updates };
}

it("installs explicitly and toggles without rewriting source or selection", () => {
  const f = fixture(false), doc = f.editor.state.doc;
  f.editor.setSelection(EditorSelection.single(source.indexOf("Body") + 2));
  const selection = f.editor.state.selection;
  expect(f.updates()).toBe(0);
  expect(setDocumentPropertiesEnabled(f.editor, true)).toEqual({ ok: true });
  expect(documentPropertiesEnabled(f.editor.state)).toBe(true); expect(f.current().data.entries[0]!.value).toBe("Original");
  expect(f.editor.state.doc).toBe(doc); expect(f.editor.state.selection).toBe(selection);
  const before = f.updates(); f.editor.setSelection(EditorSelection.single(source.indexOf("Body") + 3));
  expect(f.updates()).toBe(before);
});

it.each([false, true])("uses defaultCollapsed=%s once per document and retains manual choices", defaultCollapsed => {
  const f = fixture(true, defaultCollapsed), doc = f.editor.state.doc, selection = f.editor.state.selection;
  expect(f.current().collapsed).toBe(defaultCollapsed);
  expect(f.current().setCollapsed(!defaultCollapsed)).toEqual({ ok: true });
  expect(f.current().collapsed).toBe(!defaultCollapsed);
  expect(f.editor.state.doc).toBe(doc); expect(f.editor.state.selection).toBe(selection);
  expect(f.editor.undo()).toBe(false);
  f.editor.setMode("source"); f.editor.setMode("live");
  expect(f.current().collapsed).toBe(!defaultCollapsed);
  setDocumentPropertiesEnabled(f.editor, false); setDocumentPropertiesEnabled(f.editor, true);
  expect(f.current().collapsed).toBe(!defaultCollapsed);
  expect(f.current().change({ type: "set", key: "title", value: "Changed" }).ok).toBe(true);
  expect(f.current().collapsed).toBe(!defaultCollapsed);
  expect(f.editor.undo()).toBe(true); expect(f.editor.state.doc.toString()).toBe(source);
  expect(f.current().collapsed).toBe(!defaultCollapsed);
  const stale = f.current();
  f.editor.replaceDocument(source, "another-document");
  expect(f.current().collapsed).toBe(defaultCollapsed);
  expect(stale.setCollapsed(!defaultCollapsed)).toEqual({ ok: false, reason: "stale-target" });
  f.editor.setReadOnly(true);
  expect(f.current().setCollapsed(!defaultCollapsed)).toEqual({ ok: true });
  expect(f.current().collapsed).toBe(!defaultCollapsed);
});

it("rejects stale forms after a header update and after replacement with identical source", () => {
  const f = fixture(), original = f.current();
  expect(original.change({ type: "set", key: "title", value: "Accepted" }).ok).toBe(true);
  expect(original.change({ type: "set", key: "title", value: "Obsolete" }).ok).toBe(false);
  expect(f.editor.state.doc.toString()).toContain('title: "Accepted"');
  const old = f.current(); f.editor.replaceDocument(f.editor.state.doc.toString(), "another-document");
  expect(old.change({ type: "set", key: "title", value: "Wrong document" })).toEqual({ ok: false, reason: "stale-target" });
});

it("respects readonly/source modes and keeps unrelated body edits outside the header snapshot", () => {
  const f = fixture(), form = f.current();
  f.editor.run(state => ({ changes: { from: state.doc.length, insert: " appended" } }));
  expect(form.change({ type: "set", key: "ready", value: true }).ok).toBe(true);
  expect(f.editor.state.doc.toString().endsWith("Body appended")).toBe(true);
  const current = f.current(); f.editor.setReadOnly(true);
  expect(current.change({ type: "set", key: "title", value: "Denied" })).toEqual({ ok: false, reason: "readonly" });
  f.editor.setReadOnly(false); f.editor.setMode("source");
  expect(current.change({ type: "set", key: "title", value: "Hidden" }).ok).toBe(false);
});

it("honors collapsed defaults and preserves trigger focus with the native renderer", () => {
  const parent = document.body.appendChild(document.createElement("div"));
  editor = createMsfeEditor({ parent, markdown: source, mode: "live", extensions: [Frontmatter, DocumentProperties.configure({ defaultCollapsed: true })] });
  const toggle = parent.querySelector<HTMLButtonElement>(".msfe-document-properties > button")!;
  const list = parent.querySelector<HTMLDListElement>(".msfe-document-properties > dl")!;
  expect(toggle.getAttribute("aria-expanded")).toBe("false"); expect(list.hidden).toBe(true);
  toggle.focus(); toggle.click();
  expect(toggle.getAttribute("aria-expanded")).toBe("true"); expect(list.hidden).toBe(false);
  expect(document.activeElement).toBe(toggle);
  toggle.click(); expect(list.hidden).toBe(true);
  expect(editor.getMarkdown()).toBe(source); expect(editor.undo()).toBe(false);
});
