import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingObject } from "../../../../../document-profile/types";
import { createQuireDrawingSelectedObjectView } from "../../../../../interaction/drawing-controller/products";

/**
 * Paints owner-prepared embedding facts without interpreting embedded content.
 * @param object - Canonical object in its local CSS coordinate space.
 * @returns Retained surface sharing ordinary object geometry and selection.
 */
export function createEmbeddedDrawingView(object: QuireDrawingObject): ReturnType<typeof qkView.surface> {
  const { width, height } = object.drawing.extent;
  const presentation = object.embeddedPresentation;
  return qkView.surface({
    id: `embedded:${object.objectId}`, width, height,
    ...(presentation?.resourceKey === undefined ? {
      style: { fill: "#f6f7f9", stroke: { color: "#c8cdd4", width: 1 } },
      child: qkView.text({
        text: presentation?.label ?? "Embedded content", width, height,
        style: { font: "14px sans-serif", color: "#606977", lineHeight: 22 }
      })
    } : {
      child: qkView.customPaint({ width, height, paint: (rect, id) => [{
        id, kind: "image", rect, resourceKey: presentation.resourceKey!
      }] })
    })
  });
}

/**
 * Marks a passive embedding, or exposes only its owner's authorized resize handles.
 * @param object - Accepted object; its independent owner controls all mutations.
 * @returns Selected chrome without movement, rotation or geometry controls.
 */
export function createEmbeddedDrawingSelectedView(object: QuireDrawingObject): QuireViewNode {
  if (object.embeddedPresentation?.resizePolicy !== undefined) {
    return createQuireDrawingSelectedObjectView(object.drawing.extent.width, object.drawing.extent.height, {
      objectId: object.objectId, drawingId: object.drawing.drawingId, drawing: object.drawing,
      lockAspectRatio: object.drawing.transform.lockAspectRatio, showMoveBands: false
    });
  }
  return qkView.surface({
    id: `embedded-selection:${object.objectId}`, ...object.drawing.extent,
    interaction: { pointerEvents: "none" },
    style: { stroke: { color: "#2563eb", width: 2 } }
  });
}
