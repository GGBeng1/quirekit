import type {
  QuireDisplayCommand,
  QuirePathCommand,
  QuireRect
} from "@quirekit/renderer";
import { createQuireRoundedRectPathSegments } from "@quirekit/renderer";
import type { QuireDecorationRectVisual } from "../../decorations";

const checkboxCornerRadius = 2.25;
const checkboxMaximumSize = 18;
const checkboxPaintSurface = "content" as const;

/**
 * Appends a generic checkbox requested by decoration metadata.
 *
 * @param commands - Mutable display command sink.
 * @param visual - Decoration visual carrying source attributes and geometry.
 * @returns Whether the visual was consumed as a checkbox control.
 */
export function appendDecorationCheckboxCommands(
  commands: QuireDisplayCommand[],
  visual: QuireDecorationRectVisual
): boolean {
  if (visual.attrs["data-qk-decoration-control"] !== "checkbox") {
    return false;
  }
  const checked = visual.attrs["data-qk-decoration-checked"] === "true";
  const rect = resolveCheckboxRect(visual.rect);
  const segments = createQuireRoundedRectPathSegments(rect, checkboxCornerRadius);
  commands.push({
    id: `${visual.id}:checkbox-background`,
    kind: "path",
    layer: checkboxPaintSurface,
    range: visual.range,
    rect,
    segments,
    fillStyle: checked ? "#3978f6" : "#ffffff"
  }, {
    id: `${visual.id}:checkbox-border`,
    kind: "path",
    layer: checkboxPaintSurface,
    range: visual.range,
    rect,
    segments,
    strokeStyle: checked ? "#3978f6" : "#8a929f",
    lineWidth: 1.25
  });
  if (checked) commands.push(createCheckboxCheckCommand(visual, rect));
  return true;
}

/**
 * Fits one square checkbox inside the measured materialized-glyph rectangle.
 *
 * @param source - Decoration rectangle in document coordinates.
 * @returns Centered checkbox paint rectangle without changing layout width.
 */
function resolveCheckboxRect(source: QuireRect): QuireRect {
  const available = Math.max(1, Math.min(source.width, source.height) - 2);
  const size = Math.min(checkboxMaximumSize, available);
  return {
    x: source.x + (source.width - size) / 2,
    y: source.y + (source.height - size) / 2,
    width: size,
    height: size
  };
}

/**
 * Creates the white checked-state path inside one projected checkbox.
 *
 * @param visual - Source decoration identity and document range.
 * @param rect - Final checkbox paint rectangle.
 * @returns Renderer-neutral checkmark command.
 */
function createCheckboxCheckCommand(
  visual: QuireDecorationRectVisual,
  rect: QuireRect
): QuirePathCommand {
  const size = rect.width;
  return {
    id: `${visual.id}:checkbox-check`,
    kind: "path",
    layer: checkboxPaintSurface,
    range: visual.range,
    rect,
    segments: [{
      kind: "move-to",
      point: { x: rect.x + size * 0.22, y: rect.y + size * 0.53 }
    }, {
      kind: "line-to",
      point: { x: rect.x + size * 0.43, y: rect.y + size * 0.73 }
    }, {
      kind: "line-to",
      point: { x: rect.x + size * 0.8, y: rect.y + size * 0.28 }
    }],
    strokeStyle: "#ffffff",
    lineWidth: Math.max(1.5, size / 8)
  };
}
