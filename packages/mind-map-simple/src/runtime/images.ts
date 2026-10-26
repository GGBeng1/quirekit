import type { MindMapDocument, MindMapNode, MindMapTopicImage } from "@quirekit/mind-map";

/** @param image - Bounded embedded PNG. @returns Actual decoder completion before a source mutation. */
export async function decodeMindMapImage(image: MindMapTopicImage): Promise<void> {
  const element = new Image(); element.src = image.dataUrl;
  try { await element.decode(); } catch { throw new TypeError("主题图片无法解码，请重新选择图片"); }
}

/** @param document - Validated source with aggregate image budgets. @returns Bounded-concurrency image readiness. */
export async function prepareMindMapImages(document: MindMapDocument): Promise<void> {
  const images = new Map<string, MindMapTopicImage>();
  /** @param node - Retained topic, including folded descendants. */
  function visit(node: MindMapNode): void { if (node.details?.image) images.set(node.details.image.dataUrl, node.details.image); node.children.forEach(visit); }
  visit(document.root); document.floatingTopics?.forEach(topic => visit(topic.root));
  const queue = [...images.values()]; let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (cursor < queue.length) await decodeMindMapImage(queue[cursor++]!);
  }));
}
