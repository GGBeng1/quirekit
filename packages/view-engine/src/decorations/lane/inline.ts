import type { Decoration, DecorationAttrs } from "@quirekit/pm";
import {
  readQuireDecorationInteractions,
  type QuireDecorationInteractionDescriptor
} from "@quirekit/core";
import type { QuireDocumentRange, QuireViewTarget } from "@quirekit/renderer";
import {
  collectDecorationTextFragments,
  resolveInlineDecorationRect
} from "../geometry";
import type {
  QuireDecorationLaneOptions,
  QuireDecorationRectVisual,
  QuireDecorationTextSpan,
  QuireResolvedDecorationStyle
} from "../types";
import { intersectRanges } from "./range";

/** Inputs used to map an inline decoration into renderer-neutral lanes. */
export interface InlineDecorationLaneInput {
  /** Lane build options containing the layout snapshot. */
  readonly options: QuireDecorationLaneOptions;
  /** Source ProseMirror inline decoration. */
  readonly decoration: Decoration;
  /** Stable decoration id. */
  readonly decorationId: string;
  /** Source decoration attributes. */
  readonly attrs: DecorationAttrs;
  /** Resolved paint style. */
  readonly style: QuireResolvedDecorationStyle;
  /** Mutable background lane sink. */
  readonly backgrounds: QuireDecorationRectVisual[];
  /** Mutable typed interaction-target sink. */
  readonly interactionTargets: QuireViewTarget[];
  /** Mutable inline text-style lane sink. */
  readonly textStyles: QuireDecorationTextSpan[];
}

/**
 * Appends inline decoration visuals and text spans.
 *
 * @param input - Inline decoration mapping inputs.
 */
export function appendInlineDecorationLanes(input: InlineDecorationLaneInput): void {
  const range = {
    from: input.decoration.from,
    to: input.decoration.to
  };
  const suppressesTextPaint = readNonEmptyDecorationAttr(
    input.attrs,
    "data-qk-decoration-text-paint"
  ) === "suppress";
  const hasTextStyle =
    input.style.textColor !== undefined ||
    (input.style.textDecoration?.length ?? 0) > 0 ||
    suppressesTextPaint;
  const interactions = readQuireDecorationInteractions(input.decoration.spec);
  const exposesOwnerHandle = interactions.some(
    (interaction) => interaction.placement.kind === "inline-start"
  );
  const exposesRangeInteraction = interactions.some(
    (interaction) => interaction.placement.kind === "range"
  );
  const paintsBodyVisual = input.style.background !== undefined
    || input.style.outline !== undefined
    || input.style.keyline !== undefined
    || input.style.endIndicator !== undefined
    || input.style.cursor !== undefined;
  const gutterOwnerId = readNonEmptyDecorationAttr(
    input.attrs,
    "data-qk-decoration-gutter-owner"
  ) ?? input.decorationId;

  if (hasTextStyle) {
    input.textStyles.push({
      id: `${input.decorationId}:text-style`,
      decorationId: input.decorationId,
      range,
      ...(input.style.textColor === undefined
        ? {}
        : { textColor: input.style.textColor }),
      ...(suppressesTextPaint ? { suppressTextPaint: true } : {}),
      ...(input.style.textDecoration === undefined
        ? {}
        : { textDecoration: input.style.textDecoration })
    });
  }

  if (
    input.style.background === undefined
    && input.style.outline === undefined
    && input.style.keyline === undefined
    && input.style.endIndicator === undefined
    && hasTextStyle
    && !exposesOwnerHandle
    && !exposesRangeInteraction
    && input.style.gutterMarker === undefined
  ) {
    return;
  }

  const lineVisuals: QuireDecorationRectVisual[] = [];
  for (const fragment of collectDecorationTextFragments(
    input.options.snapshot,
    input.decoration
  )) {
    const fragmentRange = intersectRanges(fragment.range, range);
    const rect = resolveInlineDecorationRect(fragment, fragmentRange);

    if (!rect) {
      continue;
    }

    appendCoalescedInlineVisual(lineVisuals, {
      id: `${input.decorationId}:background:${fragment.id}`,
      decorationId: input.decorationId,
      range: fragmentRange,
      rect,
      attrs: input.attrs,
      ...(input.style.cursor === undefined || exposesRangeInteraction
        ? {}
        : { cursor: input.style.cursor }),
      ...(input.style.background === undefined
        ? {}
        : { background: input.style.background }),
      ...(input.style.keyline === undefined
        ? {}
        : { keyline: input.style.keyline }),
      ...(input.style.outline === undefined
        ? {}
        : { outline: input.style.outline }),
      ...(input.style.gutterMarker === undefined
        ? {}
        : {
            gutterMarker: {
              ...input.style.gutterMarker,
              ownerId: gutterOwnerId
            }
          })
    });
  }

  const paintedLineVisuals = attachFinalEndIndicator(
    lineVisuals,
    input.style.endIndicator
  );
  if (paintsBodyVisual || input.style.gutterMarker !== undefined) {
    input.backgrounds.push(...paintedLineVisuals.map(addInlineVisualBreathingRoom));
  }
  appendInlineInteractionTargets(input, lineVisuals, range, interactions);
  appendInlineOwnerHandleVisual(input, lineVisuals, range, interactions);
}

/**
 * Attaches one requested marker to the final coalesced physical fragment only.
 *
 * The semantic range may cross shaping runs or wrapped lines. Deferring this
 * assignment until after coalescing preserves exactly one terminal cue without
 * changing source geometry, layout metrics, or retained interaction targets.
 *
 * @param visuals - Exact coalesced physical fragments in document order.
 * @param endIndicator - Optional renderer-neutral terminal marker style.
 * @returns Physical fragments with at most one terminal marker.
 */
function attachFinalEndIndicator(
  visuals: readonly QuireDecorationRectVisual[],
  endIndicator: QuireResolvedDecorationStyle["endIndicator"]
): readonly QuireDecorationRectVisual[] {
  if (endIndicator === undefined || visuals.length === 0) return visuals;
  const finalIndex = visuals.length - 1;
  return visuals.map((visual, index) => (
    index === finalIndex ? { ...visual, endIndicator } : visual
  ));
}

/**
 * Projects typed decoration interactions without inspecting decoration paint.
 *
 * @param input - Inline decoration mapping inputs and target sink.
 * @param lineVisuals - Exact coalesced physical fragments before paint expansion.
 * @param ownerRange - Complete semantic decoration range.
 * @param interactions - Valid typed interaction descriptors.
 */
function appendInlineInteractionTargets(
  input: InlineDecorationLaneInput,
  lineVisuals: readonly QuireDecorationRectVisual[],
  ownerRange: QuireDocumentRange,
  interactions: readonly QuireDecorationInteractionDescriptor[]
): void {
  for (const interaction of interactions) {
    const rects = interaction.placement.kind === "range"
      ? lineVisuals.map((visual) => visual.rect)
      : lineVisuals[0] === undefined
        ? []
        : [createInlineStartInteractionRect(
            lineVisuals[0].rect,
            interaction.placement.width,
            interaction.placement.gap
          )];
    rects.forEach((rect, index) => {
      const targetId = `${input.decorationId}:${interaction.id}:${index}`;
      input.interactionTargets.push({
        id: `decoration-interaction:${targetId}`,
        nodePath: `decoration-interaction/${targetId}`,
        rect,
        range: ownerRange,
        role: interaction.role,
        part: interaction.part,
        owner: interaction.owner,
        pointerEvents: "auto",
        ...(interaction.cursor === undefined
          ? {}
          : { cursor: interaction.cursor }),
        events: interaction.handler === undefined
          ? {}
          : {
              click: {
                handler: interaction.handler.id,
                payload: {
                  ...(isRecord(interaction.handler.payload)
                    ? interaction.handler.payload
                    : {}),
                  range: ownerRange
                }
              }
            }
      });
    });
  }
}

/**
 * Appends one optional owner-handle visual beside the first exact fragment.
 *
 * The typed target was already projected independently. This phase adds only
 * editor chrome over the same geometry, and can be omitted without removing the
 * action target. The rectangle ends before the first authored glyph.
 *
 * @param input - Inline decoration mapping inputs and mutable lane sinks.
 * @param lineVisuals - Coalesced source visuals before paint-only expansion.
 * @param ownerRange - Complete inline owner range carried by the visual.
 * @param interactions - Typed interaction descriptors providing handle geometry.
 */
function appendInlineOwnerHandleVisual(
  input: InlineDecorationLaneInput,
  lineVisuals: readonly QuireDecorationRectVisual[],
  ownerRange: QuireDocumentRange,
  interactions: readonly QuireDecorationInteractionDescriptor[]
): void {
  const interaction = interactions.find(
    (candidate) => candidate.placement.kind === "inline-start"
  );
  const first = lineVisuals[0];
  if (interaction?.placement.kind !== "inline-start" || first === undefined) {
    return;
  }
  const color = readNonEmptyDecorationAttr(
    input.attrs,
    "data-qk-decoration-owner-handle-color"
  ) ?? "rgba(71, 85, 105, 0.5)";
  input.backgrounds.push({
    id: `${input.decorationId}:owner-handle`,
    decorationId: input.decorationId,
    range: ownerRange,
    rect: createInlineStartInteractionRect(
      first.rect,
      interaction.placement.width,
      interaction.placement.gap
    ),
    attrs: {
      ...input.attrs,
      "data-qk-decoration-control-part": interaction.part,
      "data-qk-decoration-owner-handle-color": color
    }
  });
}

/**
 * Resolves one inline-start interaction rectangle before authored content.
 *
 * @param firstRect - First exact physical range fragment.
 * @param width - Requested interaction width.
 * @param gap - Requested gap before the authored fragment.
 * @returns Renderer-space interaction rectangle.
 */
function createInlineStartInteractionRect(
  firstRect: QuireDecorationRectVisual["rect"],
  width: number,
  gap: number
): QuireDecorationRectVisual["rect"] {
  return {
    x: firstRect.x - gap - width,
    y: firstRect.y,
    width,
    height: firstRect.height
  };
}

/**
 * Reports whether an optional event payload can be spread safely.
 *
 * @param value - Unknown payload supplied by an extension.
 * @returns Whether the payload is a non-array object record.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Reads one non-empty string attribute from a decoration.
 *
 * @param attrs - Source decoration attributes.
 * @param key - Attribute key to inspect.
 * @returns Trimmed string value, or undefined when absent or empty.
 */
function readNonEmptyDecorationAttr(
  attrs: DecorationAttrs,
  key: string
): string | undefined {
  const value = attrs[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

/**
 * Merges adjacent script/font fragments belonging to one physical text line.
 *
 * Shaping may split a semantic inline owner at font or script boundaries.
 * Decoration chrome must keep those layout fragments as one visual while
 * preserving separate rectangles after a genuine line wrap.
 *
 * @param visuals - Mutable per-decoration line visual accumulator.
 * @param candidate - Next fragment-derived visual in layout order.
 */
function appendCoalescedInlineVisual(
  visuals: QuireDecorationRectVisual[],
  candidate: QuireDecorationRectVisual
): void {
  const previous = visuals.at(-1);
  if (previous === undefined || !canCoalesceInlineVisuals(previous, candidate)) {
    visuals.push(candidate);
    return;
  }
  const left = Math.min(previous.rect.x, candidate.rect.x);
  const right = Math.max(
    previous.rect.x + previous.rect.width,
    candidate.rect.x + candidate.rect.width
  );
  visuals[visuals.length - 1] = {
    ...previous,
    range: {
      from: Math.min(previous.range.from, candidate.range.from),
      to: Math.max(previous.range.to, candidate.range.to)
    },
    rect: {
      x: left,
      y: previous.rect.y,
      width: right - left,
      height: Math.max(previous.rect.height, candidate.rect.height)
    }
  };
}

/**
 * Reports whether two consecutive visuals form one continuous physical line.
 *
 * @param left - Previously accumulated visual.
 * @param right - Next fragment visual.
 * @returns Whether the fragment boundary is shaping-only rather than a wrap.
 */
function canCoalesceInlineVisuals(
  left: QuireDecorationRectVisual,
  right: QuireDecorationRectVisual
): boolean {
  const horizontalGap = right.rect.x - (left.rect.x + left.rect.width);
  return left.decorationId === right.decorationId
    && right.range.from <= left.range.to
    && Math.abs(left.rect.y - right.rect.y) < 0.5
    && Math.abs(left.rect.height - right.rect.height) < 0.5
    && horizontalGap >= -0.5
    && horizontalGap <= 1;
}

/**
 * Adds paint-only clearance so the outline remains visible beside glyph edges.
 *
 * @param visual - Coalesced physical-line visual.
 * @returns Visual expanded without changing layout metrics or document range.
 */
function addInlineVisualBreathingRoom(
  visual: QuireDecorationRectVisual
): QuireDecorationRectVisual {
  return {
    ...visual,
    rect: {
      x: visual.rect.x - 1,
      y: visual.rect.y - 0.5,
      width: visual.rect.width + 2,
      height: visual.rect.height + 1
    }
  };
}
