import type { QuireAiSourceCapability } from "@quirekit/ai-contract";
import { parseMindMapEmbed, type MindMapNode } from "@quirekit/mind-map";

/** Topics listed in a summary. */
const shownTopics = 60;

/**
 * @param node - Topic.
 * @param parent - Parent topic id, or null for the central topic.
 * @param topics - Collected topics in outline order.
 */
function collect(node: MindMapNode, parent: string | null, topics: { id: string; text: string; parent?: string }[]): void {
  topics.push({ id: node.id, text: node.text.replace(/\s+/gu, " ").trim(), ...(parent === null ? {} : { parent }) });
  for (const child of node.children) collect(child, node.id, topics);
}

/**
 * Shows a mind map fence as its identity, revision and topic outline instead of the map JSON,
 * so the model can change it with `updateMindMap`.
 */
export const msfeMindMapAiCapabilities: readonly QuireAiSourceCapability[] = [{
  kind: "source-block",
  names: ["FencedCode"],
  present(block) {
    if (block.attrs.language !== "quirekit-mind-map") return undefined;
    try {
      const mind = parseMindMapEmbed(block.text.split("\n").slice(1, -1).join("\n"));
      const topics: { id: string; text: string; parent?: string }[] = [];
      collect(mind.document.root, null, topics);
      return {
        label: `思维导图 ${JSON.stringify({ id: mind.id, revision: mind.document.revision, title: mind.title, total: topics.length, topics: topics.slice(0, shownTopics) })}`,
        title: `思维导图“${mind.title}”`,
        command: "updateMindMap"
      };
    } catch {
      return { label: "思维导图：源数据无效" };
    }
  }
}];
