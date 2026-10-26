import type { QuireAiBlockItem, QuireAiCapability } from "@quirekit/ai-contract";
import type { TextDiagramEmbed } from "@quirekit/text-diagram";
import { readTextDiagramNode } from "../source";

/** Source characters shown in the summary before the lines must be read as items. */
const summarySourceLength = 1200;
const cache = new WeakMap<TextDiagramEmbed, readonly QuireAiBlockItem[]>();

/** The diagram source, never the PNG, explains the diagram to the model. */
export const textDiagramAiCapabilities: readonly QuireAiCapability[] = [{
  kind: "block", node: "textDiagram",
  /** @param node - Text diagram atom. @returns Grammar and bounded source. */
  label(node) {
    const diagram = readTextDiagramNode(node);
    return diagram ? textDiagramAiLabel(diagram) : "文本绘图：源数据无效";
  },
  /** @param node - Text diagram atom. @returns Source lines. */
  items(node) {
    const diagram = readTextDiagramNode(node);
    return diagram ? textDiagramAiItems(diagram) : [];
  }
}];

/**
 * @param diagram - Validated diagram, wherever the document stores it.
 * @returns Grammar, line count and the source, cut at a bounded length.
 */
export function textDiagramAiLabel(diagram: TextDiagramEmbed): string {
  const { language, source, revision } = diagram.document;
  const truncated = source.length > summarySourceLength;
  return `文本绘图 ${JSON.stringify({ id: diagram.id, revision, title: diagram.title, language,
    lines: source.split("\n").length, source: truncated ? source.slice(0, summarySourceLength) : source, ...(truncated ? { truncated: true } : {}) })}`;
}

/**
 * @param diagram - Validated diagram, wherever the document stores it.
 * @returns One item per source line, numbered from 1.
 */
export function textDiagramAiItems(diagram: TextDiagramEmbed): readonly QuireAiBlockItem[] {
  const cached = cache.get(diagram);
  if (cached) return cached;
  const items = diagram.document.source.split("\n").map((line, index) => ({ id: `line-${index + 1}`, ...(line ? { label: line } : {}) }));
  cache.set(diagram, items);
  return items;
}
