import { describe, expect, it } from "vitest";
import { sanitizeQuireClipboardHtml } from "./html/sanitize";

describe("sanitizeQuireClipboardHtml", () => {
  it("removes active tags and inline event handlers", () => {
    expect(
      sanitizeQuireClipboardHtml(
        '<p onclick="alert(1)">safe<script>alert(2)</script><strong>bold</strong></p>'
      )
    ).toBe("<p>safe<strong>bold</strong></p>");
  });

  it("removes javascript URLs while preserving passive attributes", () => {
    expect(
      sanitizeQuireClipboardHtml(
        '<a class="link" href="javascript:alert(1)">bad</a><img src="javascript:alert(2)" alt="x">'
      )
    ).toBe('<a class="link">bad</a><img alt="x">');
  });

  it("removes unquoted, vbscript, and data:text/html URLs", () => {
    expect(sanitizeQuireClipboardHtml("<a href=javascript:alert(1)>x</a>")).toBe("<a>x</a>");
    expect(sanitizeQuireClipboardHtml('<a href="vbscript:msgbox(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeQuireClipboardHtml('<a href="data:text/html,<script>1</script>">x</a>')).toBe(
      "<a>x</a>"
    );
  });

  it("keeps data:image sources used by pasted images", () => {
    const html = '<img src="data:image/png;base64,AAAA" alt="x">';
    expect(sanitizeQuireClipboardHtml(html)).toBe(html);
  });
});
