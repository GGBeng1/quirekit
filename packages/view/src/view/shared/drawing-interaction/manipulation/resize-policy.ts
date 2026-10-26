import type { QuireEditor } from "@quirekit/core";
import type { DrawingResizePolicy } from "@quirekit/drawing-geometry";

/**
 * Captures one content-width magnet from the exact source layout at pointer down.
 * @param editor - Mounted editor exposing document-space layout facts.
 * @param position - Exact selected object's source position.
 * @param policy - Neutral owner constraints.
 * @returns Captured policy; unavailable geometry keeps ordinary dragging available.
 */
export function captureMountedDrawingResizePolicy(editor: QuireEditor, position: number,
  policy: DrawingResizePolicy | undefined): DrawingResizePolicy | undefined {
  const tolerance = policy?.snapToInlineContentWidth;
  if (tolerance === undefined || !Number.isFinite(tolerance) || tolerance < 0) return policy;
  const width = editor.view.getTextblockContentWidth?.(position, editor.state.pm.doc);
  if (width == null || !Number.isFinite(width) || width <= 0) return policy;
  return { ...policy, widthSnap: { targetWidth: Math.floor(width), tolerance } };
}
