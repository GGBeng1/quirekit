import type {
  QuireDisplayCommand,
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type { BuiltInHorizontalRuleStyle } from "./types";

const ptToPx = 96 / 72;
const geometryEpsilon = 0.01;

/** Geometry resolved for one horizontal rule inside its block envelope. */
export interface BuiltInHorizontalRulePaintGeometry {
  /** Full block-flow rectangle owned by the atomic node. */
  readonly flowRect: QuireRect;
  /** Visible rule rectangle after width and alignment resolve. */
  readonly ruleRect: QuireRect;
}

/**
 * Resolves the block envelope and visible rule geometry.
 *
 * @param origin - Parent-owned block-flow origin.
 * @param inlineSize - Available inline size.
 * @param style - Complete built-in rule style.
 * @returns Shared flow and paint rectangles.
 */
export function createBuiltInHorizontalRulePaintGeometry(
  origin: Readonly<{ x: number; y: number }>,
  inlineSize: number,
  style: BuiltInHorizontalRuleStyle
): BuiltInHorizontalRulePaintGeometry {
  const visualHeight = Math.max(1, style.thicknessPt * ptToPx);
  const flowHeight = Math.max(16, visualHeight + 12);
  const width = Math.max(1, inlineSize * (style.widthPercent / 100));
  const inlineOffset = style.alignment === "center"
    ? (inlineSize - width) / 2
    : style.alignment === "right"
      ? inlineSize - width
      : 0;
  return {
    flowRect: {
      x: origin.x,
      y: origin.y,
      width: inlineSize,
      height: flowHeight
    },
    ruleRect: {
      x: origin.x + inlineOffset,
      y: origin.y + (flowHeight - visualHeight) / 2,
      width,
      height: visualHeight
    }
  };
}

/**
 * Creates renderer-neutral display commands for one rule family.
 *
 * @param flowRect - Full block-flow rectangle supplied by the View.
 * @param id - Stable display command id prefix.
 * @param range - Exact source range.
 * @param style - Complete built-in style.
 * @returns Commands consumed identically by Canvas and SVG.
 */
export function createBuiltInHorizontalRulePaintCommands(
  flowRect: QuireRect,
  id: string,
  range: QuireDocumentRange,
  style: BuiltInHorizontalRuleStyle
): readonly QuireDisplayCommand[] {
  const rect = createBuiltInHorizontalRulePaintGeometry(
    { x: flowRect.x, y: flowRect.y },
    flowRect.width,
    style
  ).ruleRect;
  if (style.variant === "shaded") {
    return createShadedCommands(rect, id, range, style.color);
  }
  if (style.variant === "double") {
    return createDoubleCommands(rect, id, range, style.color);
  }
  const lineWidth = Math.max(1, style.thicknessPt * ptToPx);
  const dash = style.variant === "dotted"
    ? [lineWidth, lineWidth * 1.75]
    : style.variant === "dashed"
      ? [lineWidth * 4, lineWidth * 2]
      : undefined;
  const command = createLine(
    `${id}:line`,
    rect,
    range,
    style.color,
    lineWidth,
    rect.y + rect.height / 2
  );
  return [{
    ...command,
    ...(dash === undefined ? {} : { lineDash: dash, lineCap: "round" as const })
  }];
}

/**
 * Creates two parallel strokes within the accepted visual height.
 *
 * @param rect - Paint rectangle.
 * @param id - Stable command id prefix.
 * @param range - Exact source range.
 * @param color - Canonical line color.
 * @returns Two line commands.
 */
function createDoubleCommands(
  rect: QuireRect,
  id: string,
  range: QuireDocumentRange,
  color: string
): readonly QuireDisplayCommand[] {
  const stroke = Math.max(1, rect.height / 3);
  return [
    createLine(
      `${id}:double-top`,
      rect,
      range,
      color,
      stroke,
      rect.y + stroke / 2 + geometryEpsilon
    ),
    createLine(
      `${id}:double-bottom`,
      rect,
      range,
      color,
      stroke,
      rect.y + rect.height - stroke / 2 - geometryEpsilon
    )
  ];
}

/**
 * Creates the legacy shaded or bevel family.
 *
 * @param rect - Paint rectangle.
 * @param id - Stable command id prefix.
 * @param range - Exact source range.
 * @param color - Canonical body color.
 * @returns Fill plus top and bottom bevel strokes.
 */
function createShadedCommands(
  rect: QuireRect,
  id: string,
  range: QuireDocumentRange,
  color: string
): readonly QuireDisplayCommand[] {
  return [
    {
      id: `${id}:shade-body`,
      kind: "fill-rect",
      range,
      rect,
      fillStyle: color
    },
    createLine(`${id}:shade-light`, rect, range, "#ffffff99", 1, rect.y + 0.5),
    createLine(
      `${id}:shade-dark`,
      rect,
      range,
      "#00000066",
      1,
      rect.y + rect.height - 0.5
    )
  ];
}

/**
 * Creates one horizontal line command.
 *
 * @param id - Stable command id.
 * @param rect - Paint rectangle.
 * @param range - Exact source range.
 * @param color - Stroke color.
 * @param lineWidth - Stroke width.
 * @param y - Stroke center in document coordinates.
 * @returns Renderer-neutral line command.
 */
function createLine(
  id: string,
  rect: QuireRect,
  range: QuireDocumentRange,
  color: string,
  lineWidth: number,
  y: number
): QuireDisplayCommand {
  const horizontalInset = lineWidth / 2 + geometryEpsilon;
  return {
    id,
    kind: "line",
    range,
    from: { x: rect.x + horizontalInset, y },
    to: { x: rect.x + rect.width - horizontalInset, y },
    strokeStyle: color,
    lineWidth
  };
}
