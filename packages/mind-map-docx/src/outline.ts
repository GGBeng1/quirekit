import type { DocxAuthoringApi, LitAstNode } from "@quirekit/lit-docx-contract";
import { mindMapAnnotationTopics, type MindMapEmbed, type MindMapNode } from "@quirekit/mind-map";

/** @param mind - Validated source without a raster. @param api - Central Word authoring facade.
 * @returns Complete topic text, including folded descendants and separate free trees. */
export function projectMindMapOutline(mind: MindMapEmbed, api: DocxAuthoringApi): LitAstNode[] {
  const blocks: LitAstNode[] = [];
  const names = new Map<string, string>();
  /** @param text - Literal visible paragraph text. */
  function paragraph(text: string): void { blocks.push(api.blocks.paragraph({ children: [api.inline.text(text)] })); }
  /** @param node - Current immutable topic. @param depth - Source hierarchy depth, bounded by the model. */
  function visit(node: MindMapNode, depth: number): void {
    names.set(node.id, node.text);
    paragraph(`${"  ".repeat(depth)}${depth ? "• " : ""}${node.text}`);
    const details = node.details;
    if (details?.link) paragraph(`链接：${details.link}`);
    if (details?.note) paragraph(`备注：${details.note}`);
    if (details?.marker) paragraph(`优先级：${details.marker.slice(-1)}`);
    if (details?.image) paragraph(`图片：${details.image.alt || "主题图片"}`);
    node.children.forEach(child => visit(child, depth + 1));
  }
  paragraph(`思维导图：${mind.title}`);
  visit(mind.document.root, 0);
  for (const topic of mind.document.floatingTopics ?? []) {
    paragraph("自由主题"); visit(topic.root, 0);
  }
  const labels = { relation: "关联", summary: "概要", boundary: "外框" };
  for (const item of mind.document.annotations ?? []) {
    const members = mindMapAnnotationTopics(item).map(id => names.get(id)).join(item.kind === "relation" ? " → " : "、");
    paragraph(`${labels[item.kind]}：${item.text}（${members}）`);
  }
  return blocks;
}
