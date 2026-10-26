import type {
  QuireDisplayCommand,
  QuireFillRectCommand,
  QuireLineCommand
} from "@quirekit/renderer";
import { resolveQuireViewLayerPaintSurface } from "../../view-graph";
import type {
  QuireDecorationNodeVisual,
  QuireDecorationOutlineStyle,
  QuireDecorationRectVisual
} from "../../decorations";
import type { QuireDisplayListStyles } from "../types";
import { appendDecorationCheckboxCommands } from "./checkbox";
import { appendDecorationOwnerHandleCommands } from "./owner-handle";

const annotationPaintSurface = resolveQuireViewLayerPaintSurface({
  layer: { plane: "annotation" }
});

/**
 * Appends inline/node decoration background paint commands.
 *
 * @param commands - Mutable display command list being built.
 * @param backgrounds - Resolved background visuals.
 * @param styles - Resolved display-list styles.
 */
export function appendDecorationBackgroundCommands(
  commands: QuireDisplayCommand[],
  backgrounds: readonly QuireDecorationRectVisual[],
  styles: QuireDisplayListStyles
): void {
  for (const visual of backgrounds) {
    if (appendDecorationOwnerHandleCommands(commands, visual)) continue;
    if (appendDecorationCheckboxCommands(commands, visual)) continue;
    appendInlineDecorationBackgroundCommand(commands, visual);
    if (visual.outline !== undefined) {
      appendDecorationOutlineCommands(commands, visual, styles, false);
    }
    if (visual.keyline !== undefined) {
      appendDecorationKeylineCommand(commands, visual);
    }
    if (visual.endIndicator !== undefined) {
      appendDecorationEndIndicatorCommand(commands, visual);
    }
  }
}

/**
 * Appends an inline decoration fill only when the owner requested one.
 *
 * @param commands - Mutable display command list being built.
 * @param visual - Inline decoration visual carrying explicit paint.
 */
function appendInlineDecorationBackgroundCommand(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationRectVisual
): void {
  if (visual.background === undefined) return;
  commands.push({
    id: `${visual.id}:fill`,
    kind: "fill-rect",
    layer: annotationPaintSurface,
    range: visual.range,
    rect: visual.rect,
    fillStyle: visual.background
  } satisfies QuireFillRectCommand);
}

/**
 * Appends one inset bottom keyline for an open field-like decoration.
 *
 * Keeping the stroke inside the visual prevents the editor-only cue from
 * expanding layout or being clipped at a page boundary.
 *
 * @param commands - Mutable display command list being built.
 * @param visual - Inline decoration visual carrying keyline state.
 */
function appendDecorationKeylineCommand(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationRectVisual
): void {
  if (visual.keyline === undefined) return;
  const { x, y, width, height } = visual.rect;
  const lineY = y + height - visual.keyline.width / 2;
  commands.push({
    id: `${visual.id}:keyline`,
    kind: "line",
    layer: annotationPaintSurface,
    range: visual.range,
    from: { x, y: lineY },
    to: { x: x + width, y: lineY },
    strokeStyle: visual.keyline.color,
    lineWidth: visual.keyline.width
  } satisfies QuireLineCommand);
}

/**
 * Appends one inset vertical marker at the final physical range edge.
 *
 * @param commands - Mutable display command list being built.
 * @param visual - Final inline visual carrying marker geometry.
 */
function appendDecorationEndIndicatorCommand(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationRectVisual
): void {
  if (visual.endIndicator === undefined) return;
  const { x, y, width, height } = visual.rect;
  const markerLength = Math.min(
    visual.endIndicator.length,
    Math.max(0, height - 4)
  );
  const markerX = x + width - visual.endIndicator.width / 2;
  const markerTop = y + (height - markerLength) / 2;
  commands.push({
    id: `${visual.id}:end-indicator`,
    kind: "line",
    layer: annotationPaintSurface,
    range: visual.range,
    from: { x: markerX, y: markerTop },
    to: { x: markerX, y: markerTop + markerLength },
    strokeStyle: visual.endIndicator.color,
    lineWidth: visual.endIndicator.width
  } satisfies QuireLineCommand);
}

/**
 * Appends node decoration box paint commands.
 *
 * @param commands - Mutable display command list being built.
 * @param nodes - Resolved node decoration visuals.
 * @param styles - Resolved display-list styles.
 */
export function appendDecorationNodeCommands(
  commands: QuireDisplayCommand[],
  nodes: readonly QuireDecorationNodeVisual[],
  styles: QuireDisplayListStyles
): void {
  for (const visual of nodes) {
    appendNodeBackgroundCommand(commands, visual, styles);
    appendDecorationOutlineCommands(commands, visual, styles, true);
  }
}

/**
 * Appends a node decoration background command when requested.
 *
 * @param commands - Mutable display command list being built.
 * @param visual - Node visual to paint.
 * @param styles - Resolved display-list styles.
 */
function appendNodeBackgroundCommand(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationNodeVisual,
  styles: QuireDisplayListStyles
): void {
  if (visual.background === undefined) {
    return;
  }

  commands.push({
    id: `${visual.id}:fill`,
    kind: "fill-rect",
    layer: annotationPaintSurface,
    range: visual.range,
    rect: visual.rect,
    fillStyle: visual.background ?? styles.decorationFillStyle
  } satisfies QuireFillRectCommand);
}

/**
 * Appends rectangle stroke commands for a node or inline decoration.
 *
 * @param commands - Mutable display command list being built.
 * @param visual - Decoration visual to paint.
 * @param styles - Resolved display-list styles.
 * @param useDefaultOutline - Whether a missing outline uses shared node defaults.
 */
function appendDecorationOutlineCommands(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationNodeVisual | QuireDecorationRectVisual,
  styles: QuireDisplayListStyles,
  useDefaultOutline: boolean
): void {
  if (visual.outline === undefined && !useDefaultOutline) return;
  const strokeStyle = visual.outline?.color ?? styles.decorationStrokeStyle;
  const lineWidth = visual.outline?.width ?? styles.decorationLineWidth;
  const lineDash = resolveDecorationOutlineLineDash(visual.outline?.style);
  const { x, y, width, height } = visual.rect;
  const right = x + width;
  const bottom = y + height;

  commands.push(
    createDecorationLineCommand(visual, "top", x, y, right, y, strokeStyle, lineWidth, lineDash),
    createDecorationLineCommand(visual, "right", right, y, right, bottom, strokeStyle, lineWidth, lineDash),
    createDecorationLineCommand(visual, "bottom", right, bottom, x, bottom, strokeStyle, lineWidth, lineDash),
    createDecorationLineCommand(visual, "left", x, bottom, x, y, strokeStyle, lineWidth, lineDash)
  );
}

/**
 * Maps semantic outline styles to renderer-space dash patterns.
 *
 * @param style - Canonical decoration outline style.
 * @returns Alternating dash/gap lengths, or undefined for a solid stroke.
 */
function resolveDecorationOutlineLineDash(
  style: QuireDecorationOutlineStyle | undefined
): readonly number[] | undefined {
  if (style === "dashed") return [4, 3];
  if (style === "dotted") return [1, 2];
  return undefined;
}

/**
 * Creates one side of a rectangle outline for a decoration.
 *
 * @param visual - Decoration visual that owns the line.
 * @param side - Rectangle side name used in the command id.
 * @param fromX - Line start x coordinate.
 * @param fromY - Line start y coordinate.
 * @param toX - Line end x coordinate.
 * @param toY - Line end y coordinate.
 * @param strokeStyle - Stroke style to paint.
 * @param lineWidth - Stroke width to paint.
 * @param lineDash - Optional alternating dash and gap lengths.
 * @returns Line display command.
 */
function createDecorationLineCommand(
  visual: QuireDecorationNodeVisual | QuireDecorationRectVisual,
  side: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  strokeStyle: string,
  lineWidth: number,
  lineDash: readonly number[] | undefined
): QuireLineCommand {
  return {
    id: `${visual.id}:stroke-${side}`,
    kind: "line",
    layer: annotationPaintSurface,
    range: visual.range,
    from: { x: fromX, y: fromY },
    to: { x: toX, y: toY },
    strokeStyle,
    lineWidth,
    ...(lineDash === undefined ? {} : { lineDash })
  };
}
