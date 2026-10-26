import { describe, expect, it } from "vitest";
import { parser } from "@quirekit/lezer-markdown";
import { TreeFragment } from "@lezer/common";
import { containerSyntax } from "./syntax";

const grammar = parser.configure(containerSyntax(["warning", "details", "tip"]));

describe("named containers with literal titles", () => {
  it("preserves the title's source range and nested native body", () => {
    const source = "::: warning 注意 **事项** <b>原文</b>  \n*正文*\n:::";
    const node = grammar.parse(source).topNode.firstChild!;
    expect(node.name).toBe("CustomContainer");
    const title = node.getChild("ContainerTitle")!;
    expect(source.slice(title.from, title.to)).toBe("注意 **事项** <b>原文</b>");
    expect(node.getChild("Paragraph")?.getChild("Emphasis")).not.toBeNull();
    expect(node.getChildren("ContainerMark")).toHaveLength(2);
  });
  it("supports named titles within quote/list context and leaves unknown names and code literal", () => {
    for (const source of ["> ::: details 更多信息\n> body\n> :::", "- ::: details 更多信息\n  body\n  :::"]) {
      expect(grammar.parse(source).toString()).toContain("ContainerTitle");
    }
    for (const source of ["::: unknown 标题\nbody\n:::", "```\n::: details 标题\n```", "    ::: details 标题"]) {
      expect(grammar.parse(source).toString()).not.toContain("CustomContainer");
    }
  });
  it("uses a longer outer fence when the code sample contains literal container delimiters", () => {
    const source = ":::: details 示例\n```text\n:::\n```\n\n后续正文\n::::";
    const node = grammar.parse(source).topNode.firstChild!;
    expect(node.to).toBe(source.length);
    expect(source.slice(node.getChild("FencedCode")!.from, node.getChild("FencedCode")!.to)).toContain(":::");
  });
  it("agrees with a full parse after title and fence edits", () => {
    const before = ":::: details 外层\n::: tip 内层\nbody\n:::\n::::\n\nafter";
    const tree = grammar.parse(before);
    for (const [from, to, insert] of [[13, 15, "新标题"], [before.indexOf("::: tip"), before.indexOf("::: tip") + 3, ":::::"], [before.lastIndexOf("::::"), before.lastIndexOf("::::") + 4, ""]] as const) {
      const source = before.slice(0, from) + insert + before.slice(to);
      const fragments = TreeFragment.applyChanges(TreeFragment.addTree(tree), [{ fromA: from, toA: to, fromB: from, toB: from + insert.length }]);
      expect(grammar.parse(source, fragments).toString()).toBe(grammar.parse(source).toString());
    }
  });
});
