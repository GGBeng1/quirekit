import { createQuireLayoutProviderRegistration } from "@quirekit/view-engine/layout-provider";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput
} from "@quirekit/view-engine/layout-provider";
import { readFloatingObjectGeometry } from "../geometry";
import {
  createFloatingObjectContinuation,
  readFloatingObjectContinuation
} from "./continuation";
import {
  createFloatingObjectDependencySignature,
  createFloatingObjectPlan
} from "./plan";
import {
  createFloatingObjectProducts,
  createSourceOrderFallback
} from "./products";

const editableCapabilities = {
  editable: true,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

const objectCapabilities = {
  editable: false,
  selectable: true,
  focusable: true,
  copyable: true,
  commandable: true,
  accessible: true
} as const;

const controlCapabilities = {
  editable: false,
  selectable: false,
  focusable: true,
  copyable: false,
  commandable: true,
  accessible: true
} as const;

/**
 * Creates the canonical floating-object provider registration.
 *
 * @param nodeName - Schema node type owned by the extension.
 * @returns Core registration consumed by provider authority.
 */
export function createFloatingObjectProviderRegistration(
  nodeName: string
): ReturnType<typeof createQuireLayoutProviderRegistration> {
  const provider: QuireLayoutProvider = {
    id: "floating-object-flow",
    nodeTypes: [nodeName],
    capabilities: ["child-flow", "selection-domain", "semantic-export"],
    regionContract: {
      rootKind: "block-container",
      regionKind: "floating-object",
      capabilities: objectCapabilities,
      selectionPolicy: "object-selection"
    },
    layout: layoutFloatingObject
  };
  return {
    ...createQuireLayoutProviderRegistration(provider),
    // Source geometry and framework constraints fully own this implementation.
    layoutDependency: { kind: "document" }
  };
}

/**
 * Lays out one object frame, nested text root, and controls overlay.
 *
 * @param context - Framework-owned identity, constraints, and services.
 * @returns Renderer-neutral contribution shared by every backend.
 */
function layoutFloatingObject(
  context: QuireLayoutProviderContext
): QuireLayoutProviderOutput {
  const range = context.source.range;
  const geometry = readFloatingObjectGeometry(context.sourceNode.attrs);
  if (range === undefined || geometry === undefined) {
    throw new RangeError(
      "Floating object layout requires an explicit range and valid geometry."
    );
  }
  if (context.constraints.coordinateSpace !== "document") {
    throw new RangeError("Floating object layout requires document coordinates.");
  }

  // Phase 1 accepts persisted relative geometry against current parent
  // constraints. Continuation stores only this plan, never display output.
  const dependencySignature = createFloatingObjectDependencySignature(
    context,
    geometry
  );
  const plan = readFloatingObjectContinuation(context, dependencySignature)
    ?? createFloatingObjectPlan(context, geometry);
  const objectX = context.constraints.origin.x + plan.inlineOffset;
  const objectY = context.constraints.origin.y + plan.blockOffset;
  const textRange = {
    from: context.sourceContentStart,
    to: Math.max(context.sourceContentStart, range.to - 1)
  };
  const textRect = {
    x: objectX + 12,
    y: objectY + 12,
    width: Math.max(1, plan.width - 24),
    height: context.constraints.blockHeight
  };
  const childInputs = context.services.collectBlockInputs({
    node: context.sourceNode,
    contentStart: context.sourceContentStart,
    path: context.sourcePath,
    inlineSize: textRect.width
  });
  const measuredText = context.services.layoutBlockContainer({
    id: `${context.source.sourceId}:text`,
    range: textRange,
    rect: textRect,
    blockHeight: context.constraints.blockHeight,
    blockGap: context.constraints.blockGap,
    children: childInputs
  });
  const rect = {
    x: objectX,
    y: objectY,
    width: plan.width,
    height: Math.max(plan.minHeight, measuredText.rect.height + 24)
  };
  const flowRect = {
    x: context.constraints.origin.x,
    y: context.constraints.origin.y,
    width: plan.inlineOffset + rect.width,
    height: plan.blockOffset + rect.height
  };
  const acceptedTextRect = { ...measuredText.rect, x: textRect.x, y: textRect.y };

  // Phase 2 allocates independent text and control roots from host authority.
  // Missing identity is therefore a typed provider failure, never a fallback id.
  const textIdentity = context.services.allocateRootRegion({
    localId: "editable-text",
    sourceKind: "floatingObjectText",
    source: { sourceId: `${context.source.sourceId}:text`, range: textRange },
    rootKind: "text-box",
    regionKind: "text-box",
    capabilities: editableCapabilities,
    rect: acceptedTextRect,
    coordinateSpace: "document",
    selectionPolicy: "delegate-to-text",
    visualInstance: { kind: "single" }
  });
  const controlsIdentity = context.services.allocateRootRegion({
    localId: "controls",
    sourceKind: "floatingObjectControls",
    source: { sourceId: `${context.source.sourceId}:controls`, range },
    rootKind: "block-container",
    regionKind: "control",
    capabilities: controlCapabilities,
    rect,
    coordinateSpace: "document",
    selectionPolicy: "control-dispatch",
    visualInstance: { kind: "single" }
  });
  const placedText = context.services.placeBlockContainer({
    container: measuredText,
    rect: acceptedTextRect,
    owner: { root: textIdentity.root, region: textIdentity.region }
  });
  const controlsContainer = context.services.layoutBlockContainer({
    id: `${context.source.sourceId}:controls`,
    range,
    rect,
    blockHeight: rect.height,
    blockGap: 0,
    children: []
  });
  const placedControls = context.services.placeBlockContainer({
    container: controlsContainer,
    rect,
    owner: { root: controlsIdentity.root, region: controlsIdentity.region }
  });

  // Phase 3 compiles paint, interactions, semantics, and export policy from the
  // same accepted rectangle so mounted backends cannot reinterpret geometry.
  const declarations = createFloatingObjectProducts({
    context,
    flowRect,
    objectRect: rect,
    range,
    textIdentity,
    controlsIdentity
  });
  const layout = context.services.createContribution({
    id: context.source.sourceId,
    range,
    rect: flowRect,
    children: [placedText, placedControls],
    owner: { root: context.root, region: context.region },
    exportFallbacks: [createSourceOrderFallback("Floating object")]
  });

  return {
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    layout,
    declarations,
    fragments: [],
    continuation: createFloatingObjectContinuation(
      context,
      dependencySignature,
      plan
    )
  };
}
