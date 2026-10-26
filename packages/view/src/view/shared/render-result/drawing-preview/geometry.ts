import type { QuireDisplayCommand } from "@quirekit/renderer";
import { createQuireWordShapePaintCommands, type QuireDrawingManipulatingState } from "@quirekit/view-engine";

/**
 * Re-evaluates geometry controls without distorting the old path or laying out text.
 * @param state - Captured control state with canonical preview geometry.
 * @param accepted - Exact shell paint family whose identities must remain stable.
 * @returns New paths under the accepted identities, or no geometry preview.
 */
export function rebuildMountedDrawingControlPreview(state: QuireDrawingManipulatingState,
  accepted: readonly QuireDisplayCommand[]): readonly QuireDisplayCommand[] | undefined {
  const drawing = state.track.previewDrawing;
  if (drawing === undefined || drawing.kind === "picture" || drawing.kind === "embedded") return undefined;
  const paths = createQuireWordShapePaintCommands(drawing, state.track.previewFrame.rect, "control-preview");
  return paths.map((path, index) => ({ ...path, id: accepted[index]?.id ?? path.id }));
}
