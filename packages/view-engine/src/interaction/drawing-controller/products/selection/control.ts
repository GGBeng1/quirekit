import { qkView, type QuireViewNode } from "@quirekit/renderer";
import type { QuireDrawingControlPoint } from "../../../../drawing/control-points";
import type { QuireDrawingSelectedObjectViewOptions } from "../types";
import { createSelectedDrawingNodeId, createManipulationEvents, handleHitSize,
  selectionHandleHitRadius, selectionColor } from "./shared";

/**
 * Compiles a semantic control as a marker with an independent pointer hit region.
 * @param control - Reflected local point and immutable semantic identity.
 * @param options - Exact source identity and selected drawing authority.
 * @returns Portable marker and captured control target.
 */
export function createGeometryControl(control: QuireDrawingControlPoint,
  options: QuireDrawingSelectedObjectViewOptions): QuireViewNode {
  const ref = control.reference;
  const part = ref.kind === "endpoint" ? `endpoint-${ref.end}` : `adjustment-${ref.index}`;
  const id = createSelectedDrawingNodeId(options, part);
  return qkView.positioned({ id: `${id}-position`,
    left: control.position.x - selectionHandleHitRadius, top: control.position.y - selectionHandleHitRadius,
    width: handleHitSize, height: handleHitSize,
    child: qkView.overlay({ id: `${id}-target`, width: handleHitSize, height: handleHitSize, children: [
      qkView.surface({ id: `${id}-hit`, part, role: "control", width: handleHitSize, height: handleHitSize,
        events: createManipulationEvents({ objectId: options.objectId, drawingId: options.drawingId,
          operation: "control", control: ref, lockAspectRatio: false }),
        interaction: { cursor: "crosshair", captureCursor: "crosshair" } }),
      ref.kind === "endpoint"
        ? qkView.positioned({ left: 4, top: 4, child: qkView.surface({ id: `${id}-visual`, width: 8, height: 8,
            interaction: { pointerEvents: "none" },
            style: { fill: selectionColor, stroke: { color: "#ffffff", width: 2 }, borderRadius: 4 } }) })
        : qkView.customPaint({ id: `${id}-visual`, width: handleHitSize, height: handleHitSize,
            interaction: { pointerEvents: "none" },
            paint: (rect, paintId) => [{ id: paintId, kind: "path", rect, fillStyle: "#f3b52b", strokeStyle: "#ffffff", lineWidth: 1.5,
              segments: [
                { kind: "move-to", point: { x: rect.x + 8, y: rect.y + 3 } },
                { kind: "line-to", point: { x: rect.x + 13, y: rect.y + 8 } },
                { kind: "line-to", point: { x: rect.x + 8, y: rect.y + 13 } },
                { kind: "line-to", point: { x: rect.x + 3, y: rect.y + 8 } }, { kind: "close-path" }
              ] }] })
    ] })
  });
}
