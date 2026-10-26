import type {
  QuireDocumentRange,
  QuireRect,
  QuireViewOwner
} from "@quirekit/renderer";
import type {
  QuireLayoutProviderContext,
  QuireLayoutProviderRegionDeclaration
} from "@quirekit/view-engine/layout-provider";
import {
  createFloatingObjectControls,
  createFloatingObjectSurface
} from "./layers";
import {
  createFloatingObjectTargets
} from "./targets";

type AllocatedRootRegion = ReturnType<
  QuireLayoutProviderContext["services"]["allocateRootRegion"]
>;

/** Inputs accepted by floating-object product compilation. */
export interface FloatingObjectProductRequest {
  /** Current provider execution and framework-owned compiler services. */
  readonly context: QuireLayoutProviderContext;
  /** Authoritative block-flow envelope in document coordinates. */
  readonly flowRect: QuireRect;
  /** Accepted visual object rectangle in document coordinates. */
  readonly objectRect: QuireRect;
  /** Exact source range owned by the object. */
  readonly range: QuireDocumentRange;
  /** Framework-allocated nested text identity. */
  readonly textIdentity: AllocatedRootRegion;
  /** Framework-allocated control identity. */
  readonly controlsIdentity: AllocatedRootRegion;
}

/**
 * Compiles all retained products from one accepted object rectangle.
 *
 * @param request - Accepted geometry, identities, and provider authority.
 * @returns Primary, text-box, and control declarations in ownership order.
 */
export function createFloatingObjectProducts(
  request: FloatingObjectProductRequest
): readonly QuireLayoutProviderRegionDeclaration[] {
  const {
    context,
    flowRect,
    objectRect,
    range,
    textIdentity,
    controlsIdentity
  } = request;
  const owner = createFloatingObjectOwner(context);

  // Product compilation deliberately consumes one accepted rectangle. Backends
  // may choose different paint surfaces, but cannot reinterpret placement.
  const primaryRegion = context.services.declareRegionProducts({
    declaration: context.services.declarePrimaryRegion(flowRect),
    owner: { root: context.root, region: context.region },
    layerContributions: [context.services.compileLayerContribution({
      contributionId: "floating-object-surface",
      owner: { root: context.root, region: context.region },
      range,
      rect: objectRect,
      coordinateSpace: "document",
      layer: { plane: "drawing", zIndex: 1 },
      paintSurface: "content",
      node: createFloatingObjectSurface(
        objectRect.width,
        objectRect.height,
        owner
      )
    })],
    interactionTargets: createFloatingObjectTargets(context, objectRect, range),
    semantics: {
      role: "object",
      label: "Floating object",
      search: { kind: "source-text" }
    },
    exportFallbacks: [createSourceOrderFallback("Floating object")]
  });
  const textRegion = context.services.declareRegionProducts({
    declaration: textIdentity.declaration,
    owner: { root: textIdentity.root, region: textIdentity.region },
    semantics: {
      role: "text-box",
      label: "Floating object text",
      search: { kind: "source-text" }
    },
    exportFallbacks: [createSourceOrderFallback("Nested floating text")]
  });
  const controlsRegion = context.services.declareRegionProducts({
    declaration: controlsIdentity.declaration,
    owner: { root: controlsIdentity.root, region: controlsIdentity.region },
    layerContributions: [context.services.compileLayerContribution({
      contributionId: "floating-object-controls",
      owner: { root: controlsIdentity.root, region: controlsIdentity.region },
      range,
      rect: objectRect,
      coordinateSpace: "document",
      layer: { plane: "controls", zIndex: 10 },
      paintSurface: "overlay",
      activation: { kind: "selected-owner" },
      node: createFloatingObjectControls(
        objectRect.width,
        objectRect.height,
        owner
      )
    })],
    semantics: {
      role: "control",
      label: "Floating object controls",
      search: {
        kind: "excluded",
        reason: "Manipulation controls are not document content."
      }
    },
    exportFallbacks: [{
      kind: "omitted-interaction",
      targetFormat: "html",
      reason: "Manipulation controls are editor UI."
    }]
  });

  return [primaryRegion, textRegion, controlsRegion];
}

/**
 * Creates renderer-neutral source owner metadata.
 *
 * @param context - Current provider execution.
 * @returns Exact source owner for qkView targets.
 */
function createFloatingObjectOwner(
  context: QuireLayoutProviderContext
): QuireViewOwner {
  return {
    kind: "document-node",
    id: context.source.sourceId,
    name: context.sourceNode.type.name,
    metadata: { capability: "floating-object" }
  };
}

/**
 * Creates a semantic HTML source-order degradation policy.
 *
 * @param subject - Human-readable exported subject.
 * @returns Explicit semantic degradation descriptor.
 */
export function createSourceOrderFallback(subject: string) {
  return {
    kind: "semantic-degraded" as const,
    targetFormat: "html" as const,
    reason: `${subject} degrades to source-order HTML.`
  };
}
