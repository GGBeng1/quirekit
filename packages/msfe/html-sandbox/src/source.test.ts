// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { createMsfeEditor, type MsfeEditor } from "@quirekit/msfe-core";
import { writeHtmlSandboxFence } from "@quirekit/html-sandbox/markdown";
import { MsfeHtmlSandbox } from "./extension";
const editors: MsfeEditor[] = [];
afterEach(() => { editors.splice(0).forEach(editor => editor.destroy()); document.body.replaceChildren(); });
it("only recognizes closed opted-in fences and preserves exact original source", () => {
  const html = '<pre>```</pre>\n<button>hello</button>';
  const markdown = writeHtmlSandboxFence(html);
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement('div')), markdown, extensions: [MsfeHtmlSandbox] });
  editors.push(editor);
  expect(editor.querySource('htmlSandbox').matches[0]?.attrs.html).toBe(html);
  editor.replaceDocument('```html\n<button>plain</button>\n```', 'plain');
  expect(editor.querySource('htmlSandbox').matches).toHaveLength(0);
  editor.replaceDocument('```html-preview\n<button>unfinished', 'unfinished');
  expect(editor.querySource('htmlSandbox').matches).toHaveLength(0);
});
it("updates canonical source through commands with can, history and readonly semantics", () => {
  const before = writeHtmlSandboxFence('<button>old</button>');
  const editor = createMsfeEditor({ parent: document.body.appendChild(document.createElement('div')), markdown: before, extensions: [MsfeHtmlSandbox] });
  editors.push(editor);
  const html = '<button onclick="this.remove()">new</button>\n';
  expect(editor.can().updateAttributes('htmlSandbox', { html })).toBe(true);
  expect(editor.getMarkdown()).toBe(before);
  expect(editor.commands.updateAttributes('htmlSandbox', { html })).toBe(true);
  expect(editor.querySource('htmlSandbox').matches[0]?.attrs.html).toBe(html);
  expect(editor.undo()).toBe(true); expect(editor.getMarkdown()).toBe(before);
  expect(editor.redo()).toBe(true); expect(editor.getMarkdown()).toBe(writeHtmlSandboxFence(html));
  editor.setReadOnly(true);
  expect(editor.commands.updateAttributes('htmlSandbox', { html: 'denied' })).toBe(false);
  expect(editor.getMarkdown()).toBe(writeHtmlSandboxFence(html));
});
