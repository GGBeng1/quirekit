import { describe, expect, it } from "vitest";
import { parseHtmlFragments } from "./fragments";

describe("source-addressable HTML regions", () => {
  it("pairs nested tags with quoted angle brackets and text entities", () => {
    const text = '<span title="a>b">中文 &amp; <strong>safe</strong></span>';
    const [fragment] = parseHtmlFragments(text, null);
    expect(fragment?.elements.map(element => element.tag)).toEqual(["span", "strong"]);
    expect(fragment?.elements.map(element => text.slice(element.open.from, element.open.to))).toEqual(['<span title="a>b">', "<strong>"]);
    expect(fragment?.entities.map(range => text.slice(range.from, range.to))).toEqual(["&amp;"]);
  });
  it("never authorizes markup that Markdown classified as code", () => {
    expect(parseHtmlFragments("<strong>code</strong>", new Set())).toEqual([]);
    expect(parseHtmlFragments("<strong>code</strong>", new Set([0, 12]))).toHaveLength(1);
  });
  it.each(["<span>unfinished", "<span>bad</b>", "<script>alert(1)</script>", "<div><x-app>bad</x-app></div>",
    "<table>\n<tr><td>split</td></tr>\n</table>", "<span\ntitle='x'>multiline tag</span>", "<span>".repeat(40) + "x" + "</span>".repeat(40),
    "<details><summary>heading</summary>body</details>", "<div><p>one</p><p>two</p></div>", "<p>one</p><p>two</p>"])("keeps unsupported or incomplete content as source: %s", source => {
    expect(parseHtmlFragments(source, null)).toEqual([]);
  });
  it("admits a closed block and a complete single-line table without normalizing source", () => {
    expect(parseHtmlFragments("<div>\n<p>one</p>\n<p>two</p>\n</div>", null)).toHaveLength(1);
    expect(parseHtmlFragments("<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>", null)).toHaveLength(1);
  });
  it("keeps commented and oversized regions completely visible", () => {
    expect(parseHtmlFragments('<div><!-- hidden --><span>text</span></div>', null)).toEqual([]);
    expect(parseHtmlFragments('<p>' + 'x'.repeat(65_536) + '</p>', null)).toEqual([]);
  });
});
