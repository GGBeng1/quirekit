import { describe, expect, it } from "vitest";
import { readQuireClipboardHtmlFragment } from "./fragment";

describe("producer HTML clipboard fragments", () => {
  it("discards Office transport markup and surrounding CRLF, not table body content", () => {
    const body = '<table>\r\n<tr><td><p>A<br>B</p><p></p></td></tr>\r\n</table>';
    expect(readQuireClipboardHtmlFragment(`<html><head><title>Word</title></head>\r\n<body>\r\n<!--StartFragment-->\r\n${body}\r\n<!--EndFragment-->\r\n</body></html>`)).toBe(body);
  });

  it.each([
    "<p>Before</p><table><tr><td>A</td></tr></table><p>After</p>",
    "<!--StartFragment--><p>Missing end</p>",
    "<!--EndFragment--><p>Missing start</p>",
    "<!--EndFragment--><p>Reverse</p><!--StartFragment-->"
  ])("keeps unmarked or incomplete payload intact: %s", html => {
    expect(readQuireClipboardHtmlFragment(html)).toBe(html);
  });

  it("preserves mixed authored content inside the selected fragment", () => {
    const body = "<p>Before</p><p></p><table><tr><td>A</td></tr></table><p>After</p>";
    expect(readQuireClipboardHtmlFragment(`<!--StartFragment-->${body}<!--EndFragment-->`)).toBe(body);
  });
});
