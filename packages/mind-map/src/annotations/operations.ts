import { readMindMapDocument } from "../model/document";
import type { MindMapDocument } from "../model/types";
import type { MindMapAnnotation } from "./types";

/** @param document - Immutable source. @param annotation - Complete object to insert or replace.
 * @returns Validated atomic replacement, preserving host revision. */
export function putMindMapAnnotation(document: MindMapDocument, annotation: MindMapAnnotation): MindMapDocument {
  const source = readMindMapDocument(document), entries = source.annotations ?? [];
  const annotations = entries.some(item => item.id === annotation.id)
    ? entries.map(item => item.id === annotation.id ? annotation : item) : [...entries, annotation];
  const result = readMindMapDocument({ ...source, version: Math.max(4, source.version), floatingTopics: source.floatingTopics ?? [], annotations });
  return JSON.stringify(result) === JSON.stringify(source) ? document : result;
}

/** @param document - Immutable source. @param id - Annotation identity. @returns Source without that object; missing IDs are a no-op. */
export function removeMindMapAnnotation(document: MindMapDocument, id: string): MindMapDocument {
  const source = readMindMapDocument(document);
  if (!source.annotations?.some(item => item.id === id)) return document;
  return readMindMapDocument({ ...source, annotations: source.annotations.filter(item => item.id !== id) });
}
