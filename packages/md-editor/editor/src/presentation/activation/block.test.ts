// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { activeProseBlock } from "./block";

describe("shared active block boundary", () => {
  it.each([
    ['<blockquote><div data-qk-prose="p"><div class="cm-line">body</div></div></blockquote>', "blockquote"],
    ['<ul><li><ul><li><div class="cm-line">body</div></li></ul></li></ul>', "ul"],
    ['<div data-qk-prose="table"><div class="cm-line">body</div></div>', '[data-qk-prose="table"]'],
    ['<section class="qk-prose-container"><header><div class="cm-line">body</div></header></section>', "section"],
    ['<section><div class="qk-prose-container__body"><blockquote><div class="cm-line">body</div></blockquote></div></section>', "blockquote"],
    ['<section data-custom-block><div class="cm-line">body</div></section>', "section"],
  ])("uses the same ancestor rule for native and custom blocks: %s", (html, selector) => {
    const content = document.createElement("div"); content.innerHTML = html;
    const original = content.innerHTML;
    const expected = content.querySelector(selector);
    const node = content.querySelector(".cm-line")!.firstChild!;
    expect(activeProseBlock(content, node)).toBe(expected);
    expect(content.innerHTML).toBe(original);
  });

  it("does not invent a block for a source separator or an unrelated DOM node", () => {
    const content = document.createElement("div"); content.innerHTML = '<div class="cm-line md-separator-line"><br></div>';
    expect(activeProseBlock(content, content.firstChild!)).toBeNull();
    expect(activeProseBlock(content, document.createElement("p"))).toBeNull();
    expect(activeProseBlock(content, content)).toBeNull();
  });
});
