import { describe, expect, it } from "vitest";
import { parseWebFontCss } from "./css-parser";

describe("provider-neutral web-font CSS parser", () => {
  it("resolves relative shards against the versioned provider stylesheet", () => {
    const parsed = parseWebFontCss(`
      @font-face {
        font-family: "LXGW WenKai";
        src: local("LXGW WenKai"), url("./regular-cjk.woff2") format("woff2");
        font-style: normal;
        font-weight: 400;
        unicode-range: U+4E00-9FFF;
      }
    `, {
      requestedFamily: "LXGW WenKai",
      providerLabel: "Chinese Web Fonts",
      stylesheetUrl: new URL(
        "https://cdn.example.test/npm/@chinese-fonts/lxgwwenkai@3.0.0/dist/regular/result.css"
      )
    });

    expect(parsed.family).toBe("LXGW WenKai");
    expect(parsed.faces).toHaveLength(1);
    expect(parsed.faces[0]?.assets[0]).toMatchObject({
      unicodeRange: "U+4E00-9FFF",
      sources: [{
        url: "https://cdn.example.test/npm/@chinese-fonts/lxgwwenkai@3.0.0/dist/regular/regular-cjk.woff2",
        format: "woff2"
      }]
    });
  });
});
