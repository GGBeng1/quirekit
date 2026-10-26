import { collectInvisibleCharacterVisuals } from "../invisible-characters";
import { collectQuireDecorations } from "../collect";
import type { QuireViewTarget } from "@quirekit/renderer";
import {
  readQuireDecorationAttrs,
  resolveQuireDecorationStyle
} from "../style";
import type {
  QuireDecorationDiagnostic,
  QuireDecorationLanes,
  QuireDecorationLaneOptions,
  QuireDecorationNodeVisual,
  QuireDecorationPointVisual,
  QuireDecorationRectVisual,
  QuireDecorationTextSpan,
  QuireDecorationWidget
} from "../types";
import { createDecorationId } from "./id";
import { appendInlineDecorationLanes } from "./inline";
import { appendNodeDecorationLane } from "./node";
import { appendWidgetDecorationLanes } from "./widget";
import { resolveQuireDecorationGutterMarkers } from "../geometry";

/**
 * Builds renderer-neutral decoration lanes for a layout snapshot.
 *
 * @param options - Mounted view and layout snapshot inputs.
 * @returns Decoration lanes for display-list generation and widget overlays.
 */
export function buildQuireDecorationLane(
  options: QuireDecorationLaneOptions
): QuireDecorationLanes {
  const backgrounds: QuireDecorationRectVisual[] = [];
  const interactionTargets: QuireViewTarget[] = [];
  const textStyles: QuireDecorationTextSpan[] = [];
  const nodes: QuireDecorationNodeVisual[] = [];
  const pointMarkers: QuireDecorationPointVisual[] = [];
  const widgets: QuireDecorationWidget[] = [];
  const diagnostics: QuireDecorationDiagnostic[] = [];
  // Decoration positions must share the exact PM state that produced layout.
  // During IME composition this is a speculative document, while the mounted
  // view deliberately remains committed for browser and widget lifecycle.
  const decorations = [
    ...collectQuireDecorations(options.view, options.snapshot.state.pm),
    ...(options.frameDecorations ?? [])
  ];

  decorations.forEach((decoration, index) => {
    const decorationId = createDecorationId(decoration, index);
    const attrs = readQuireDecorationAttrs(decoration);
    if (
      options.scope === "persistent-content"
      && attrs["data-qk-decoration-persistence"] !== "content"
    ) {
      return;
    }
    const resolution = resolveQuireDecorationStyle({
      decorationId,
      attrs,
      theme: options.theme
    });

    diagnostics.push(
      ...resolution.diagnostics.map((diagnostic) => ({
        ...diagnostic,
        range: { from: decoration.from, to: decoration.to }
      }))
    );

    if (decoration.widget) {
      appendWidgetDecorationLanes({
        options,
        decoration,
        decorationId,
        attrs,
        style: resolution.style,
        index,
        pointMarkers,
        interactionTargets,
        widgets
      });
      return;
    }

    if (decoration.inline) {
      appendInlineDecorationLanes({
        options,
        decoration,
        decorationId,
        attrs,
        style: resolution.style,
        backgrounds,
        interactionTargets,
        textStyles
      });
      return;
    }

    appendNodeDecorationLane({
      options,
      decoration,
      decorationId,
      attrs,
      style: resolution.style,
      nodes
    });
  });

  return {
    invisibleCharacters: collectInvisibleCharacterVisuals(options),
    interactionTargets,
    backgrounds,
    textStyles,
    nodes,
    pointMarkers,
    gutterMarkers: resolveQuireDecorationGutterMarkers(
      options.snapshot,
      backgrounds
    ),
    widgets,
    diagnostics
  };
}
