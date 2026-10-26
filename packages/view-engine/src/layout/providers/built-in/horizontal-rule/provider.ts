import { qkView } from "@quirekit/renderer";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderInteractionTarget,
  QuireLayoutProviderOutput
} from "../../../../layout-provider";
import {
  createBuiltInHorizontalRulePaintCommands,
  createBuiltInHorizontalRulePaintGeometry
} from "./paint";
import { resolveBuiltInHorizontalRuleStyle } from "./style";

const ruleCapabilities = {
  editable: false,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

/** Built-in projection for the StarterKit horizontal-rule node contract. */
export const quireHorizontalRuleProvider: QuireLayoutProvider = {
  id: "horizontal-rule-flow",
  nodeTypes: ["horizontalRule"],
  capabilities: ["selection-domain", "semantic-export"],
  regionContract: {
    rootKind: "block-container",
    regionKind: "node-body",
    capabilities: ruleCapabilities,
    selectionPolicy: "node-selection"
  },
  layout: layoutHorizontalRule
};

/**
 * Lays out one atomic rule and compiles its shared display products.
 *
 * @param context - Framework-owned identity, constraints, and services.
 * @returns Provider output installed as the source node contribution.
 */
function layoutHorizontalRule(
  context: QuireLayoutProviderContext
): QuireLayoutProviderOutput {
  const range = context.source.range;
  if (range === undefined) {
    throw new RangeError("Horizontal rule layout requires an explicit range.");
  }
  if (context.constraints.coordinateSpace !== "document") {
    throw new RangeError("Horizontal rule layout requires document coordinates.");
  }

  // Phase 1 resolves geometry once from persisted style and parent flow. Both
  // renderer backends therefore consume the same percentage and alignment.
  const style = resolveBuiltInHorizontalRuleStyle(context.sourceNode.attrs);
  const geometry = createBuiltInHorizontalRulePaintGeometry(
    context.constraints.origin,
    context.constraints.inlineSize,
    style
  );

  // Phase 2 publishes paint and interaction from the accepted rectangles so
  // visual and selection ownership cannot drift between Canvas and SVG.
  const declaration = context.services.declareRegionProducts({
    declaration: context.services.declarePrimaryRegion(geometry.flowRect),
    owner: { root: context.root, region: context.region },
    layerContributions: [context.services.compileLayerContribution({
      contributionId: "horizontal-rule-paint",
      owner: { root: context.root, region: context.region },
      range,
      rect: geometry.flowRect,
      coordinateSpace: "document",
      layer: { plane: "content", zIndex: 0 },
      paintSurface: "content",
      node: qkView.customPaint({
        id: "horizontal-rule",
        width: geometry.flowRect.width,
        height: geometry.flowRect.height,
        range,
        paint: (rect, id) =>
          createBuiltInHorizontalRulePaintCommands(rect, id, range, style)
      })
    })],
    interactionTargets: [createHorizontalRuleInteractionTarget(
      context,
      geometry.flowRect
    )],
    semantics: {
      role: "group",
      label: "Horizontal rule",
      search: {
        kind: "excluded",
        reason: "A horizontal rule has no searchable text."
      }
    },
    exportFallbacks: [{
      kind: "native",
      targetFormat: "html",
      reason: "Horizontal rules serialize to semantic HTML hr elements."
    }]
  });
  const layout = context.services.createContribution({
    id: context.source.sourceId,
    range,
    rect: geometry.flowRect,
    owner: { root: context.root, region: context.region },
    exportFallbacks: [{
      kind: "native",
      targetFormat: "html",
      reason: "Horizontal rules serialize to semantic HTML hr elements."
    }]
  });

  return {
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    layout,
    declarations: [declaration],
    fragments: [],
    continuation: null
  };
}

/**
 * Creates the node-selection target spanning the comfortable flow envelope.
 *
 * @param context - Current provider execution.
 * @param rect - Accepted block-flow rectangle.
 * @returns One node-domain interaction target.
 */
function createHorizontalRuleInteractionTarget(
  context: QuireLayoutProviderContext,
  rect: Readonly<{ x: number; y: number; width: number; height: number }>
): QuireLayoutProviderInteractionTarget {
  const range = context.source.range;
  if (range === undefined) {
    throw new RangeError("Horizontal rule selection requires an explicit range.");
  }
  return {
    targetId: "horizontal-rule-selection",
    range,
    rect,
    coordinateSpace: "document",
    layer: { plane: "content", zIndex: 0 },
    pointerPolicy: {
      kind: "select",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    },
    intent: {
      kind: "node",
      nodeId: context.source.sourceId,
      pos: { pos: range.from, bias: 1 }
    }
  };
}
