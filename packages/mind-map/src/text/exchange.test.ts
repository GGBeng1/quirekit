import { expect, it } from "vitest";
import { importMindMapText, exportMindMapText } from "./index";
import { setMindMapTopicDetails, putMindMapAnnotation } from "../index";
it("uses heading and list ownership, ordered lists, literal escaping and fenced text", () => {
  const { document } = importMindMapText("```markdown\n# 项目\n## 准备\n- 调研\n  - 中文\\*文字\n  1. 证据\n## 实施\n- 开发\n```", "markdown");
  expect(document.root.text).toBe("项目"); expect(document.root.children.map(n => n.text)).toEqual(["准备", "实施"]);
  expect(document.root.children[0]!.children[0]!.children.map(n => n.text)).toEqual(["中文*文字", "证据"]);
});
it("reads tabs, rejects skipped/mixed depth and bounds untrusted input", () => {
  expect(importMindMapText("根\n\t子主题\n\t\t后代", "outline").document.root.children[0]!.children[0]!.text).toBe("后代");
  for (const text of ["根\n    跳级", "根\n \t混合", "根\n 子主题"]) expect(() => importMindMapText(text, "outline")).toThrow();
  expect(() => importMindMapText("x".repeat(4000001), "outline")).toThrow("budget");
  expect(() => importMindMapText("```js\nalert(1)", "markdown")).toThrow("fence");
});
it("retains extra root trees with an explicit positioning difference", () => {
  const result = importMindMapText("# 主树\n- 第一分支\n# 自由树\n- 自由子主题", "markdown");
  expect(result.document.floatingTopics![0]!.root.children[0]!.text).toBe("自由子主题"); expect(result.diagnostics[0]!.path).toBe("floatingTopics.position");
});
it("exports hidden content, reports all nontext fields and preserves original source", () => {
  let source = importMindMapText("根\n  折叠\n    后代", "outline").document;
  source = setMindMapTopicDetails(source, [source.root.id], { note: "备注" });
  source = putMindMapAnnotation(source, { id: "r", kind: "relation", from: source.root.id, to: source.root.children[0]!.id, text: "联系" });
  const result = exportMindMapText(source, "markdown"); expect(result.text).toContain("  - 后代");
  expect(result.diagnostics.map(d => d.path)).toEqual(expect.arrayContaining(["details", "annotations", "layout"])); expect(source.root.details!.note).toBe("备注");
  expect(importMindMapText(result.text, "markdown").document.root.children[0]!.children[0]!.text).toBe("后代");
});
it("preserves literal markup without executing or stripping it and keeps continuation lines", () => {
  const result = importMindMapText("# <script>title</script>\n- literal [link](javascript:alert(1))\n  第二行", "markdown");
  expect(result.document.root.text).toBe("<script>title</script>"); expect(result.document.root.children[0]!.text).toContain("\n第二行");
  expect(exportMindMapText(result.document, "outline").diagnostics[0]!.path).toContain("text");
});

it("represents empty topics and reports whitespace that cannot be textual structure", () => {
  const source = importMindMapText("# \n- ", "markdown").document;
  expect(source.root.text).toBe(""); expect(source.root.children[0]!.text).toBe("");
  expect(importMindMapText(exportMindMapText(source, "markdown").text, "markdown").document.root.text).toBe("");
  expect(exportMindMapText(source, "outline").diagnostics.filter(d => d.code === "fallback")).toHaveLength(2);
});
