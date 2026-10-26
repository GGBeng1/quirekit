import type {
  QuireLayoutProviderInteractionAnchor,
  QuireLayoutProviderInteractionIntent,
  QuireLayoutProviderInteractionTarget
} from "../../../layout-provider/interaction";
import type { QuireLayoutProviderRegionProductsRequest } from "../types";
import type { QuireRetainedRegionLayerTargetDeclaration } from "../../region-products/declaration";
import type {
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import type {
  QuireViewAnchor,
  QuireViewInteractionHit
} from "../../../view-graph";

/** Exact framework owner supplied while provider products are compiled. */
type ProviderInteractionOwner = QuireLayoutProviderRegionProductsRequest["owner"];

/**
 * Compiles one provider interaction target into the canonical retained declaration.
 *
 * The provider owns semantic intent and geometry. Framework authority injects the
 * exact root, region occurrence, source, and capabilities at this boundary.
 *
 * @param target - Provider-owned target in an explicit coordinate space.
 * @param owner - Framework-owned retained root and region occurrence.
 * @returns Canonical retained layer-target declaration.
 */
export function compileQuireLayoutProviderInteractionTarget(
  target: QuireLayoutProviderInteractionTarget,
  owner: ProviderInteractionOwner
): QuireRetainedRegionLayerTargetDeclaration {
  if (target.coordinateSpace !== "document") {
    throw new RangeError(
      `Layout provider interaction target "${target.targetId}" must use document coordinates.`
    );
  }

  const root = owner.root;
  const region = owner.region;

  return {
    targetId: target.targetId,
    regionId: region.regionId.value,
    range: target.range,
    rect: target.rect,
    ...(target.layer === undefined ? {} : { layer: target.layer }),
    ...(target.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: target.pointerPolicy }),
    interactionHit: compileProviderInteractionIntent(
      target.intent,
      root,
      region,
      target.range
    )
  };
}

/**
 * Compiles capability-owned provider intent into one shared interaction hit.
 *
 * @param intent - Owner-free semantic intent declared by the provider.
 * @param root - Framework-owned retained root.
 * @param region - Exact retained region occurrence.
 * @param range - Exact document range represented by the target.
 * @returns Canonical interaction hit carrying complete routing authority.
 */
function compileProviderInteractionIntent(
  intent: QuireLayoutProviderInteractionIntent,
  root: QuireLayoutRoot,
  region: QuireLayoutRegionRef,
  range: QuireLayoutProviderInteractionTarget["range"]
): QuireViewInteractionHit {
  const authority = {
    region,
    source: root.source,
    capabilities: root.capabilities
  } as const;

  switch (intent.kind) {
    case "text":
      return {
        kind: "text",
        ...authority,
        anchor: compileProviderInteractionAnchor(intent.anchor, root, region)
      };
    case "cell":
      return {
        kind: "cell",
        ...authority,
        tableId: intent.tableId,
        cellId: intent.cellId
      };
    case "node":
      return {
        kind: "node",
        ...authority,
        nodeId: intent.nodeId,
        pos: intent.pos.pos
      };
    case "object":
      return {
        kind: "object",
        ...authority,
        objectId: intent.objectId
      };
    case "media":
      return {
        kind: "media",
        ...authority,
        mediaId: intent.mediaId,
        part: intent.part
      };
    case "embed":
      return {
        kind: "embed",
        ...authority,
        embedId: intent.embedId,
        part: intent.part
      };
    case "content-control":
      return {
        kind: "content-control",
        ...authority,
        controlId: intent.controlId,
        controlType: intent.controlType,
        part: intent.part,
        range
      };
    case "widget":
      return {
        kind: "widget",
        ...authority,
        widgetId: intent.widgetId,
        part: intent.part
      };
    case "field":
      return {
        kind: "field",
        ...authority,
        fieldId: intent.fieldId,
        anchor: compileProviderInteractionAnchor(intent.anchor, root, region)
      };
    case "readonly-text":
      return {
        kind: "readonly-text",
        ...authority,
        ownerNodeId: intent.ownerNodeId,
        range: intent.range
      };
    case "boundary-caret":
      return {
        kind: "boundary-caret",
        ...authority,
        anchor: compileProviderInteractionAnchor(intent.anchor, root, region),
        side: intent.side
      };
    case "control":
      return {
        kind: "control",
        ...authority,
        controlId: intent.controlId
      };
    default:
      return assertUnreachableProviderInteractionIntent(intent);
  }
}

/**
 * Scopes an owner-free provider anchor to framework-retained identity.
 *
 * @param anchor - Provider anchor containing position and affinity.
 * @param root - Framework-owned retained root.
 * @param region - Exact retained region occurrence.
 * @returns Canonical root- and region-scoped anchor.
 */
function compileProviderInteractionAnchor(
  anchor: QuireLayoutProviderInteractionAnchor,
  root: QuireLayoutRoot,
  region: QuireLayoutRegionRef
): QuireViewAnchor {
  return {
    rootId: root.id,
    regionId: region.regionId,
    position: anchor.position,
    affinity: anchor.affinity
  };
}

/**
 * Preserves exhaustiveness when public interaction intent grows.
 *
 * @param intent - Intent variant missing from the compiler switch.
 * @returns Never; the function always throws for uncompiled intent.
 */
function assertUnreachableProviderInteractionIntent(intent: never): never {
  throw new TypeError(
    `Unsupported layout provider interaction intent: ${JSON.stringify(intent)}`
  );
}
