import type { MindMapDiagramPatch } from "./types";

/**
 * Reads a new mind map the way models tend to write it: when the central topic is listed as a
 * topic of its own (named by root, or the only topic without a parent that others hang under),
 * that topic becomes the central one; topics without a parent go directly under it.
 * @param root - Central topic text as written.
 * @param patch - Topics and other changes.
 * @returns Central topic text, and topics whose parents name `root` for the central topic.
 */
export function normalizeMindMapInsertion(root: string, patch: MindMapDiagramPatch): { readonly root: string; readonly patch: MindMapDiagramPatch } {
  const topics = patch.topics ?? [];
  const orphans = topics.filter(topic => topic.parent === undefined);
  const central = topics.find(topic => topic.parent === undefined && (topic.id === root || topic.text === root))
    ?? (orphans.length === 1 && topics.some(topic => topic.parent === orphans[0]!.id) ? orphans[0] : undefined);
  const alias = central?.id;
  const rest = topics.filter(topic => topic !== central).map(topic => ({
    ...topic, parent: topic.parent === undefined || topic.parent === alias ? "root" : topic.parent
  }));
  return { root: central?.text ?? root, patch: { ...patch, topics: rest } };
}
