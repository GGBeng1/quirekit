import { readMindMapDocument } from "./document";
import type { MindMapDocument, MindMapLayout } from "./types";
/** @param document - Original source. @param layout - Admitted arrangement. @returns One source change with a compatible format version. */
export function setMindMapLayout(document: MindMapDocument, layout: MindMapLayout): MindMapDocument {
  const source = readMindMapDocument(document);
  if (source.layout === layout) return document;
  const version = layout === "organization" || layout === "timeline" ? 6 : source.version;
  return readMindMapDocument({ ...source, version, layout,
    ...(version >= 2 ? { floatingTopics: source.floatingTopics ?? [] } : {}),
    ...(version >= 4 ? { annotations: source.annotations ?? [] } : {}) });
}
