import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutProviderContext,
  QuireLayoutProviderInteractionTarget
} from "@quirekit/view-engine/layout-provider";

/**
 * Creates the object-frame interaction targets.
 *
 * @param context - Current provider execution.
 * @param rect - Accepted object rectangle.
 * @param range - Exact source range.
 * @returns Object-domain targets for all four frame edges.
 */
export function createFloatingObjectTargets(
  context: QuireLayoutProviderContext,
  rect: QuireRect,
  range: QuireDocumentRange
): readonly QuireLayoutProviderInteractionTarget[] {
  const frameWidth = 8;
  const surface = {
    targetId: "object-selection-surface",
    range,
    rect,
    coordinateSpace: "document",
    layer: { plane: "drawing", zIndex: 1 },
    pointerPolicy: {
      kind: "select",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    },
    intent: { kind: "object", objectId: context.source.sourceId }
  } as const satisfies QuireLayoutProviderInteractionTarget;
  const edges = [
    {
      part: "top",
      rect: { x: rect.x, y: rect.y, width: rect.width, height: frameWidth }
    },
    {
      part: "right",
      rect: {
        x: rect.x + rect.width - frameWidth,
        y: rect.y,
        width: frameWidth,
        height: rect.height
      }
    },
    {
      part: "bottom",
      rect: {
        x: rect.x,
        y: rect.y + rect.height - frameWidth,
        width: rect.width,
        height: frameWidth
      }
    },
    {
      part: "left",
      rect: { x: rect.x, y: rect.y, width: frameWidth, height: rect.height }
    }
  ] as const;

  return [surface, ...edges.map((edge): QuireLayoutProviderInteractionTarget => ({
    targetId: `object-selection-frame:${edge.part}`,
    range,
    rect: edge.rect,
    coordinateSpace: "document",
    layer: { plane: "drawing", zIndex: 1 },
    pointerPolicy: {
      kind: "select",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    },
    intent: { kind: "object", objectId: context.source.sourceId }
  }))];
}
