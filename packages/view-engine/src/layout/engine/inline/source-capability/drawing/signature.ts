import type { DrawingPayload } from "@quirekit/drawing-geometry";

/**
 * Creates stable invalidation identity for source-owned drawing presentation.
 *
 * Layout geometry has a separate signature. This fragment covers canonical
 * drawing fields that can change retained paint or selected-only chrome
 * without moving the source anchor.
 *
 * @param drawing - Validated canonical drawing payload.
 * @returns Deterministic presentation signature fragment.
 */
export function createWordDrawingPresentationSignature(
  drawing: DrawingPayload
): string {
  const { appearance, textBody, transform } = drawing;
  return [
    drawing.kind,
    JSON.stringify(drawing.geometry ?? null),
    transform.rotation,
    transform.flipHorizontal,
    transform.flipVertical,
    transform.lockAspectRatio,
    appearance.fill.kind,
    appearance.fill.color ?? "",
    appearance.fill.opacity,
    appearance.stroke.kind,
    appearance.stroke.color ?? "",
    appearance.stroke.width,
    appearance.stroke.opacity,
    appearance.stroke.dash,
    textBody?.insets.top ?? "",
    textBody?.insets.right ?? "",
    textBody?.insets.bottom ?? "",
    textBody?.insets.left ?? "",
    textBody?.verticalAlignment ?? "",
    textBody?.wrapInside ?? "",
    textBody?.rotation ?? "",
    textBody?.upright ?? "",
    textBody?.autofit ?? "",
    textBody?.opacity ?? ""
  ].join("\u0002");
}
