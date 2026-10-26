import type {
  QuireDisplayCommand,
  QuirePathCommand,
  QuirePathSegment,
  QuireRect
} from "@quirekit/renderer";
import type { QuireDecorationPointVisual } from "../../decorations";
import { resolveQuireViewLayerPaintSurface } from "../../view-graph";
import { createQuireBoundaryMarkerSegments } from "./boundary-marker";

const annotationPaintSurface = resolveQuireViewLayerPaintSurface({
  layer: { plane: "annotation" }
});

/**
 * Appends metric-neutral markers for zero-width anchors: speech bubbles beside
 * interactive anchors, brackets or an insertion bar at range boundaries.
 *
 * @param commands - Mutable display command sink.
 * @param markers - Resolved point markers in renderer coordinates.
 */
export function appendDecorationPointMarkerCommands(
  commands: QuireDisplayCommand[],
  markers: readonly QuireDecorationPointVisual[]
): void {
  for (const marker of markers) {
    commands.push({
      id: marker.id,
      kind: "path",
      layer: annotationPaintSurface,
      range: marker.range,
      rect: marker.rect,
      segments: marker.shape === undefined || marker.shape === "speech-bubble"
        ? createSpeechBubbleSegments(marker.rect)
        : createQuireBoundaryMarkerSegments(marker.rect, marker.shape),
      strokeStyle: marker.color,
      lineWidth: marker.lineWidth
    } satisfies QuirePathCommand);
  }
}

/**
 * Creates one compact outlined speech bubble with an integrated lower tail.
 *
 * The path stays inside the retained marker rectangle so Canvas and SVG share
 * identical clipping and do not change document metrics.
 *
 * @param rect - Final marker paint bounds.
 * @returns Clockwise renderer-neutral path segments.
 */
function createSpeechBubbleSegments(
  rect: QuireRect
): readonly QuirePathSegment[] {
  const inset = Math.max(0.75, Math.min(rect.width, rect.height) * 0.08);
  const left = rect.x + inset;
  const top = rect.y + inset;
  const right = rect.x + rect.width - inset;
  const bottom = rect.y + rect.height - inset;
  const tailHeight = Math.min(rect.height * 0.22, 3);
  const bodyBottom = bottom - tailHeight;
  const radius = Math.max(
    1,
    Math.min(rect.width, bodyBottom - top) * 0.18
  );
  const tailStart = left + rect.width * 0.28;
  const tailTip = left + rect.width * 0.2;
  const tailEnd = left + rect.width * 0.48;

  return [
    { kind: "move-to", point: { x: left + radius, y: top } },
    { kind: "line-to", point: { x: right - radius, y: top } },
    {
      kind: "quadratic-curve-to",
      control: { x: right, y: top },
      point: { x: right, y: top + radius }
    },
    { kind: "line-to", point: { x: right, y: bodyBottom - radius } },
    {
      kind: "quadratic-curve-to",
      control: { x: right, y: bodyBottom },
      point: { x: right - radius, y: bodyBottom }
    },
    { kind: "line-to", point: { x: tailEnd, y: bodyBottom } },
    { kind: "line-to", point: { x: tailTip, y: bottom } },
    { kind: "line-to", point: { x: tailStart, y: bodyBottom } },
    { kind: "line-to", point: { x: left + radius, y: bodyBottom } },
    {
      kind: "quadratic-curve-to",
      control: { x: left, y: bodyBottom },
      point: { x: left, y: bodyBottom - radius }
    },
    { kind: "line-to", point: { x: left, y: top + radius } },
    {
      kind: "quadratic-curve-to",
      control: { x: left, y: top },
      point: { x: left + radius, y: top }
    },
    { kind: "close-path" }
  ];
}
