import type { MindMapNode } from "../model/types";
import type { MindMapAnnotation } from "./types";

/** @param roots - Forest roots. @returns Every retained topic identity, including folded descendants. */
export function mindMapTopicIds(roots: readonly MindMapNode[]): Set<string> {
  const ids = new Set<string>();
  /** @param node - Current topic. */
  function visit(node: MindMapNode): void { ids.add(node.id); node.children.forEach(visit); }
  roots.forEach(visit); return ids;
}

/** @param annotation - Semantic object. @returns Referenced topic identities in stable order. */
export function mindMapAnnotationTopics(annotation: MindMapAnnotation): readonly string[] {
  return annotation.kind === "relation" ? [annotation.from, annotation.to] : annotation.topicIds;
}

/** @param annotations - Previous objects. @param retained - Surviving topic identities. @returns Objects with deleted references removed. */
export function retainMindMapAnnotations(annotations: readonly MindMapAnnotation[], retained: ReadonlySet<string>): MindMapAnnotation[] {
  return annotations.flatMap<MindMapAnnotation>(annotation => {
    if (annotation.kind === "relation") return retained.has(annotation.from) && retained.has(annotation.to) ? [annotation] : [];
    const topicIds = annotation.topicIds.filter(id => retained.has(id));
    return topicIds.length ? [{ ...annotation, topicIds }] : [];
  });
}
