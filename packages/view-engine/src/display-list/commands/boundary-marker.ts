import type { QuirePathSegment, QuireRect } from "@quirekit/renderer";

/**
 * Creates an open path for one range-boundary marker inside its rectangle.
 *
 * Brackets have short serifs toward the enclosed text; the insertion bar marks
 * an empty range with serifs on both sides.
 *
 * @param rect - Marker rectangle spanning the line height.
 * @param shape - Boundary shape.
 * @returns Stroke-only path segments.
 */
export function createQuireBoundaryMarkerSegments(
  rect: QuireRect,
  shape: "open-bracket" | "close-bracket" | "insertion-bar"
): readonly QuirePathSegment[] {
  const top = rect.y + rect.height * 0.12;
  const bottom = rect.y + rect.height * 0.88;
  if (shape === "insertion-bar") {
    const center = rect.x + rect.width / 2;
    return [
      { kind: "move-to", point: { x: rect.x, y: top } },
      { kind: "line-to", point: { x: rect.x + rect.width, y: top } },
      { kind: "move-to", point: { x: center, y: top } },
      { kind: "line-to", point: { x: center, y: bottom } },
      { kind: "move-to", point: { x: rect.x, y: bottom } },
      { kind: "line-to", point: { x: rect.x + rect.width, y: bottom } }
    ];
  }
  const spine = shape === "open-bracket" ? rect.x + 0.5 : rect.x + rect.width - 0.5;
  const tip = shape === "open-bracket" ? rect.x + rect.width : rect.x;
  return [
    { kind: "move-to", point: { x: tip, y: top } },
    { kind: "line-to", point: { x: spine, y: top } },
    { kind: "line-to", point: { x: spine, y: bottom } },
    { kind: "line-to", point: { x: tip, y: bottom } }
  ];
}
