import type {
  QuireDocumentRange,
  QuireViewTarget
} from "@quirekit/renderer";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireViewInteractionHit,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../../view-graph";
import { hasQuireViewTargetEventBindings } from "../../view-graph";

/** Shared retained fields used to create concrete qkView interaction hits. */
interface QuireViewTargetInteractionHitBase {
  /** Region inherited from the owning layout product. */
  readonly region: QuireLayoutRegionRef;
  /** Retained layer resolved for the target. */
  readonly layer: QuireViewLayerRef;
  /** Retained pointer policy resolved for the target. */
  readonly pointerPolicy: QuireViewPointerPolicy;
  /** Source identity represented by the target. */
  readonly source: QuireLayoutSourceRef;
  /** Capabilities inherited from the owning layout product. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
}

/**
 * Creates a canonical interaction hit for retained qkView targets.
 *
 * @param options - Target, range, layer, policy, and retained owner facts.
 * @returns Interaction hit, or undefined for passive visual-only targets.
 */
export function createQuireViewTargetInteractionHit(options: {
  /** qkView target being adapted. */
  readonly target: QuireViewTarget;
  /** Document range represented by the target. */
  readonly range: QuireDocumentRange;
  /** Retained layer resolved for the target. */
  readonly layer: QuireViewLayerRef;
  /** Retained pointer policy resolved for the target. */
  readonly pointerPolicy: QuireViewPointerPolicy;
  /** Retained region inherited from the owning layout product. */
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  /** Capabilities inherited from the owning layout product. */
  readonly capabilities?: QuireLayoutCapabilitySet | undefined;
  /** Explicit source identity inherited from the owning layout product. */
  readonly source?: QuireLayoutSourceRef | undefined;
}): QuireViewInteractionHit | undefined {
  if (
    options.viewRegion === undefined
    || options.source === undefined
    || options.capabilities === undefined
  ) {
    return undefined;
  }

  const base = createQuireViewTargetInteractionHitBase({
    ...options,
    viewRegion: options.viewRegion,
    source: options.source,
    capabilities: options.capabilities
  });

  switch (options.layer.plane) {
    case "drawing":
      return {
        ...base,
        kind: "object",
        objectId: options.target.owner?.id ?? options.target.id
      };
    case "controls":
    case "dom-proxy":
    case "floating-ui":
      if (options.target.owner?.kind === "content-control") {
        return {
          ...base,
          kind: "content-control",
          controlId: options.target.owner.id ?? options.target.id,
          controlType: options.target.role ?? "content-control",
          part: options.target.part ?? options.target.role ?? "control-body",
          range: options.range
        };
      }
      return hasQuireViewTargetEventBindings(options.target)
        ? createQuireViewWidgetInteractionHit(options.target, base)
        : {
            ...base,
            kind: "control",
            controlId: options.target.owner?.id ?? options.target.id
          };
    default:
      return hasQuireViewTargetEventBindings(options.target)
        ? createQuireViewWidgetInteractionHit(options.target, base)
        : undefined;
  }
}

/**
 * Creates fields shared by every concrete qkView interaction hit.
 *
 * @param options - Target, range, layer, policy, and retained owner facts.
 * @returns Shared retained interaction hit fields.
 */
function createQuireViewTargetInteractionHitBase(options: {
  /** qkView target being adapted. */
  readonly target: QuireViewTarget;
  /** Document range represented by the target. */
  readonly range: QuireDocumentRange;
  /** Retained layer resolved for the target. */
  readonly layer: QuireViewLayerRef;
  /** Retained pointer policy resolved for the target. */
  readonly pointerPolicy: QuireViewPointerPolicy;
  /** Retained region inherited from the owning layout product. */
  readonly viewRegion: QuireLayoutRegionRef;
  /** Capabilities inherited from the owning layout product. */
  readonly capabilities: QuireLayoutCapabilitySet;
  /** Explicit source identity inherited from the owning layout product. */
  readonly source: QuireLayoutSourceRef;
}): QuireViewTargetInteractionHitBase {
  return {
    region: options.viewRegion,
    layer: options.layer,
    pointerPolicy: options.pointerPolicy,
    source: options.source,
    capabilities: options.capabilities
  };
}

/**
 * Creates a widget interaction hit for eventful qkView targets.
 *
 * @param target - Eventful qkView target.
 * @param base - Shared retained interaction hit fields.
 * @returns Widget interaction hit.
 */
function createQuireViewWidgetInteractionHit(
  target: QuireViewTarget,
  base: QuireViewTargetInteractionHitBase
): QuireViewInteractionHit {
  return {
    ...base,
    kind: "widget",
    widgetId: target.id,
    part: target.part ?? target.role ?? "target"
  };
}
