import { WidgetType, type Decoration, type DecorationAttrs } from "@quirekit/pm";
import {
  readQuireDecorationInteractions,
  type QuireDecorationInteractionDescriptor,
  type QuireDecorationPointInteractionPlacement
} from "@quirekit/core";
import type { QuireDocumentRange, QuireRect, QuireViewTarget } from "@quirekit/renderer";
import {
  resolveQuireDecorationWidgetLineRect,
  resolveQuireDecorationWidgetRect
} from "../geometry";
import type {
  QuireDecorationLaneOptions,
  QuireDecorationPointVisual,
  QuireResolvedDecorationStyle,
  QuireDecorationWidget
} from "../types";
import {
  createQuireDecorationBoundaryMarker,
  isQuireDecorationBoundaryMarker
} from "./boundary-marker";

/** Inputs used to map one widget decoration into retained lanes. */
export interface WidgetDecorationLaneInput {
  /** Lane build options containing the layout snapshot. */
  readonly options: QuireDecorationLaneOptions;
  /** Source ProseMirror widget decoration. */
  readonly decoration: Decoration;
  /** Stable decoration id. */
  readonly decorationId: string;
  /** Source renderer-neutral attributes. */
  readonly attrs: DecorationAttrs;
  /** Resolved renderer-neutral paint style. */
  readonly style: QuireResolvedDecorationStyle;
  /** Source index used for ordinary widget fallback identity. */
  readonly index: number;
  /** Mutable point-marker visual sink. */
  readonly pointMarkers: QuireDecorationPointVisual[];
  /** Mutable typed interaction-target sink. */
  readonly interactionTargets: QuireViewTarget[];
  /** Mutable ordinary DOM-widget sink. */
  readonly widgets: QuireDecorationWidget[];
}

/**
 * Projects a semantic point widget or retains an ordinary DOM widget.
 *
 * @param input - Widget decoration, resolved geometry, and mutable lane sinks.
 */
export function appendWidgetDecorationLanes(
  input: WidgetDecorationLaneInput
): void {
  const widgetType = input.decoration.type instanceof WidgetType
    ? input.decoration.type
    : undefined;
  const interactions = readQuireDecorationInteractions(
    widgetType?.spec ?? input.decoration.spec
  );
  const pointInteractions = interactions.filter(
    (interaction): interaction is QuireDecorationInteractionDescriptor & {
      readonly placement: QuireDecorationPointInteractionPlacement;
    } => interaction.placement.kind === "point"
  );
  if (pointInteractions.length === 0 && isQuireDecorationBoundaryMarker(input.style.pointMarker)) {
    input.pointMarkers.push(createQuireDecorationBoundaryMarker(
      input.options,
      input.decorationId,
      input.decoration.from,
      input.style.pointMarker
    ));
    return;
  }
  if (pointInteractions.length === 0) {
    input.widgets.push(createQuireDecorationWidget(
      input.options,
      input.decoration,
      input.decorationId,
      input.index
    ));
    return;
  }

  const caretAnchorRect = resolveQuireDecorationWidgetRect(
    input.options.snapshot,
    input.decoration.from
  );
  const lineAnchorRect = pointInteractions.some(
    (interaction) => interaction.placement.alignment === "visual-line-end"
  )
    ? resolveQuireDecorationWidgetLineRect(
        input.options.snapshot,
        input.decoration.from
      )
    : caretAnchorRect;
  const range = { from: input.decoration.from, to: input.decoration.to };
  const primaryAnchorRect = resolvePointAnchorRect(
    caretAnchorRect,
    lineAnchorRect,
    pointInteractions[0]!.placement
  );
  const primaryTargetRect = resolvePointTargetRect(
    primaryAnchorRect,
    pointInteractions[0]!.placement
  );
  if (input.style.pointMarker !== undefined) {
    input.pointMarkers.push({
      id: `${input.decorationId}:point-marker`,
      decorationId: input.decorationId,
      range,
      rect: resolvePointMarkerRect(
        primaryTargetRect,
        input.style.pointMarker.size
      ),
      color: input.style.pointMarker.color,
      lineWidth: input.style.pointMarker.lineWidth
    });
  }
  pointInteractions.forEach((interaction, index) => {
    input.interactionTargets.push(createPointInteractionTarget(
      input,
      range,
      resolvePointAnchorRect(
        caretAnchorRect,
        lineAnchorRect,
        interaction.placement
      ),
      interaction,
      index
    ));
  });
}

/**
 * Selects the requested horizontal authority without changing the source range.
 *
 * @param caretAnchorRect - Exact caret-stop rectangle.
 * @param lineAnchorRect - Complete visual-line content rectangle.
 * @param placement - Point placement containing the horizontal policy.
 * @returns Geometry whose trailing edge owns the point target.
 */
function resolvePointAnchorRect(
  caretAnchorRect: QuireRect,
  lineAnchorRect: QuireRect,
  placement: QuireDecorationPointInteractionPlacement
): QuireRect {
  return placement.alignment === "visual-line-end"
    ? lineAnchorRect
    : caretAnchorRect;
}

/**
 * Creates a renderer-neutral widget decoration descriptor.
 *
 * @param options - Lane options containing the layout snapshot.
 * @param decoration - Widget decoration to map.
 * @param decorationId - Stable decoration id.
 * @param index - Decoration index used for fallback ids.
 * @returns Widget descriptor.
 */
export function createQuireDecorationWidget(
  options: QuireDecorationLaneOptions,
  decoration: Decoration,
  decorationId: string,
  index: number
): QuireDecorationWidget {
  const rect = resolveQuireDecorationWidgetRect(
    options.snapshot,
    decoration.from
  );
  const widgetType = decoration.type instanceof WidgetType
    ? decoration.type
    : undefined;
  const side = widgetType?.side ?? 0;
  const range = { from: decoration.from, to: decoration.to };

  return {
    id: decorationId,
    decorationId,
    range,
    rect,
    decoration,
    side,
    target: {
      id: `${decorationId}:target:${index}`,
      nodePath: `${decorationId}:target`,
      rect,
      range,
      pointerEvents: "auto",
      events: {},
      owner: {
        kind: "decoration",
        id: decorationId,
        name: "widget",
        metadata: {
          side,
          key: decoration.spec?.key
        }
      }
    }
  };
}

/**
 * Resolves a retained point target immediately after one caret-stop rectangle.
 *
 * @param anchorRect - Exact caret-stop geometry from the layout snapshot.
 * @param placement - Requested target size and gap.
 * @returns Renderer-space target rectangle centered on the source line.
 */
function resolvePointTargetRect(
  anchorRect: QuireRect,
  placement: QuireDecorationPointInteractionPlacement
): QuireRect {
  return {
    x: anchorRect.x + anchorRect.width + placement.gap,
    y: anchorRect.y + (anchorRect.height - placement.height) / 2,
    width: placement.width,
    height: placement.height
  };
}

/**
 * Centers one square point marker inside its more forgiving hit target.
 *
 * @param targetRect - Retained target rectangle.
 * @param requestedSize - Marker size requested by the feature owner.
 * @returns Marker paint rectangle contained by the target.
 */
function resolvePointMarkerRect(
  targetRect: QuireRect,
  requestedSize: number
): QuireRect {
  const size = Math.max(1, Math.min(
    requestedSize,
    targetRect.width,
    targetRect.height
  ));
  return {
    x: targetRect.x + (targetRect.width - size) / 2,
    y: targetRect.y + (targetRect.height - size) / 2,
    width: size,
    height: size
  };
}

/**
 * Creates one exact zero-width retained target and extension-owned action.
 *
 * @param input - Owning decoration inputs.
 * @param range - Exact zero-width source range.
 * @param anchorRect - Caret-stop geometry from the layout snapshot.
 * @param interaction - Valid point interaction descriptor.
 * @param index - Stable interaction index within the source decoration.
 * @returns Retained renderer target.
 */
function createPointInteractionTarget(
  input: WidgetDecorationLaneInput,
  range: QuireDocumentRange,
  anchorRect: QuireRect,
  interaction: QuireDecorationInteractionDescriptor & {
    readonly placement: QuireDecorationPointInteractionPlacement;
  },
  index: number
): QuireViewTarget {
  const targetId = `${input.decorationId}:${interaction.id}:${index}`;
  return {
    id: `decoration-interaction:${targetId}`,
    nodePath: `decoration-interaction/${targetId}`,
    rect: resolvePointTargetRect(anchorRect, interaction.placement),
    range,
    role: interaction.role,
    part: interaction.part,
    owner: interaction.owner,
    pointerEvents: "auto",
    ...(interaction.cursor === undefined ? {} : { cursor: interaction.cursor }),
    events: interaction.handler === undefined
      ? {}
      : {
          click: {
            handler: interaction.handler.id,
            payload: {
              ...(isRecord(interaction.handler.payload)
                ? interaction.handler.payload
                : {}),
              range
            }
          }
        }
  };
}

/**
 * Reports whether an event payload can be spread into a clone-safe target.
 *
 * @param value - Unknown event payload.
 * @returns Whether property access is safe.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
