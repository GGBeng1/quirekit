import type { SimpleInstance, SimpleNode } from "../../vendor/types";
import type { AnnotationBounds, AnnotationTopicGeometry } from "./types";

/** @param rectangles - Nonempty world rectangles. @returns Their enclosing rectangle. */
export function annotationBounds(rectangles: readonly AnnotationBounds[]): AnnotationBounds {
  const x = Math.min(...rectangles.map(rect => rect.x)), y = Math.min(...rectangles.map(rect => rect.y));
  return { x, y, width: Math.max(...rectangles.map(rect => rect.x + rect.width)) - x,
    height: Math.max(...rectangles.map(rect => rect.y + rect.height)) - y };
}

/** @param instance - Settled renderer. @returns One linear-time visible subtree cache, without source reads. */
export function annotationGeometry(instance: SimpleInstance): ReadonlyMap<string, AnnotationTopicGeometry> {
  const result = new Map<string, AnnotationTopicGeometry>();
  /** @param node - Current visible node. @returns Cached geometry including visible descendants. */
  function visit(node: SimpleNode): AnnotationTopicGeometry {
    const own = { x: node.left, y: node.top, width: node.width, height: node.height };
    const bounds = [own];
    if (node.getData("expand") !== false) for (const child of node.children) {
      const geometry = visit(child);
      if (!child.getData("_quirekitFree")) bounds.push(geometry.subtree);
    }
    const geometry = { node: own, subtree: annotationBounds(bounds), side: node.dir ?? "right" as const };
    result.set(String(node.getData("uid")), geometry); return geometry;
  }
  visit(instance.renderer.root); return result;
}
