import type {
  QuireDisplayCommand,
  QuireFillRectCommand,
  QuireLineCommand
} from "@quirekit/renderer";
import type { QuireDecorationGutterVisual } from "../../decorations";
import { resolveQuireViewLayerPaintSurface } from "../../view-graph";

const annotationPaintSurface = resolveQuireViewLayerPaintSurface({
  layer: { plane: "annotation" }
});

/**
 * Appends one metric-neutral page-gutter change bar and author token.
 *
 * @param commands - Mutable display command sink.
 * @param markers - Page-resolved gutter marker visuals.
 * @returns Nothing.
 */
export function appendDecorationGutterMarkerCommands(
  commands: QuireDisplayCommand[],
  markers: readonly QuireDecorationGutterVisual[]
): void {
  for (const marker of markers) {
    const centerX = marker.rect.x + marker.rect.width / 2;
    commands.push({
      id: `${marker.id}:bar`,
      kind: "line",
      layer: annotationPaintSurface,
      range: marker.range,
      from: { x: centerX, y: marker.rect.y },
      to: { x: centerX, y: marker.rect.y + marker.rect.height },
      strokeStyle: marker.color,
      lineWidth: marker.lineWidth,
      lineCap: "round"
    } satisfies QuireLineCommand);

    if (marker.tokenSize <= 0) continue;
    commands.push({
      id: `${marker.id}:author-token`,
      kind: "fill-rect",
      layer: annotationPaintSurface,
      range: marker.range,
      rect: {
        x: centerX - marker.tokenSize / 2,
        y: marker.rect.y - marker.tokenSize - 2,
        width: marker.tokenSize,
        height: marker.tokenSize
      },
      fillStyle: marker.color
    } satisfies QuireFillRectCommand);
  }
}
