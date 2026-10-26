import type {
  QuireDisplayCommand,
  QuireLineCommand
} from "@quirekit/renderer";
import type { QuireDecorationRectVisual } from "../../decorations";
import { resolveQuireViewLayerPaintSurface } from "../../view-graph";

const ownerHandlePaintSurface = resolveQuireViewLayerPaintSurface({
  layer: { plane: "annotation" }
});
const ownerHandleTickLength = 3;
const ownerHandleLineWidth = 1;

/**
 * Appends a restrained open bracket for one separate inline owner handle.
 *
 * The retained visual rectangle is the pointer target. Paint stays on its
 * start edge with its short ticks facing the authored content, so the wider
 * target never turns into a heavy document marker or occupies authored inline
 * geometry.
 *
 * @param commands - Mutable display-command sink.
 * @param visual - Decoration visual carrying owner-handle metadata.
 * @returns Whether the visual was consumed as an owner handle.
 */
export function appendDecorationOwnerHandleCommands(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationRectVisual
): boolean {
  if (
    visual.attrs["data-qk-decoration-control-part"] !== "owner-handle"
  ) {
    return false;
  }
  const color = readOwnerHandleColor(visual);
  const edgeX = visual.rect.x + ownerHandleLineWidth / 2;
  const handleHeight = Math.max(2, Math.min(14, visual.rect.height - 3));
  const top = visual.rect.y + (visual.rect.height - handleHeight) / 2;
  const bottom = top + handleHeight;
  commands.push(
    createOwnerHandleLine(visual, "vertical", edgeX, top, edgeX, bottom, color),
    createOwnerHandleLine(
      visual,
      "top",
      edgeX,
      top,
      edgeX + ownerHandleTickLength,
      top,
      color
    ),
    createOwnerHandleLine(
      visual,
      "bottom",
      edgeX,
      bottom,
      edgeX + ownerHandleTickLength,
      bottom,
      color
    )
  );
  return true;
}

/**
 * Resolves the source-provided stable owner-handle color.
 *
 * @param visual - Decoration visual carrying optional handle paint metadata.
 * @returns CSS color accepted by renderer backends.
 */
function readOwnerHandleColor(visual: QuireDecorationRectVisual): string {
  const value = visual.attrs["data-qk-decoration-owner-handle-color"];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "rgba(71, 85, 105, 0.5)";
}

/**
 * Creates one line of the open owner-handle bracket.
 *
 * @param visual - Source visual providing identity and document range.
 * @param part - Stable bracket part used in command identity.
 * @param fromX - Start x coordinate.
 * @param fromY - Start y coordinate.
 * @param toX - End x coordinate.
 * @param toY - End y coordinate.
 * @param color - Resolved stable stroke color.
 * @returns Renderer-neutral annotation line.
 */
function createOwnerHandleLine(
  visual: QuireDecorationRectVisual,
  part: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
): QuireLineCommand {
  return {
    id: `${visual.id}:owner-handle-${part}`,
    kind: "line",
    layer: ownerHandlePaintSurface,
    range: visual.range,
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    strokeStyle: color,
    lineWidth: ownerHandleLineWidth
  };
}
