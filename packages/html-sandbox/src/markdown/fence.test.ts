import { describe, it, expect } from "vitest";
import { readHtmlSandboxFence, writeHtmlSandboxFence } from "./fence";
describe("explicit HTML fence", () => {
  it("distinguishes plain HTML, incomplete and closed executable fences", () => {
    expect(readHtmlSandboxFence('```html\nx\n```')).toBeNull();
    expect(readHtmlSandboxFence('```html-preview\nx')).toEqual({ html: 'x', closed: false });
    expect(readHtmlSandboxFence('~~~html-preview\nx\n~~~')).toEqual({ html: 'x', closed: true });
  });
  it("preserves inner fences and CRLF source", () => {
    expect(readHtmlSandboxFence(writeHtmlSandboxFence('no trailing newline'))?.html).toBe('no trailing newline');
    const html = '<pre>```\r\nx</pre>\r\n';
    expect(readHtmlSandboxFence(writeHtmlSandboxFence(html))).toEqual({ html, closed: true });
    expect(readHtmlSandboxFence('```html-preview\nx\n```\nnot the same block')).toBeNull();
  });
});
