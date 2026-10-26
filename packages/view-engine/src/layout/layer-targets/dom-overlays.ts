import {
  resolveDefaultQuireViewPointerPolicyForLayer,
  type QuireViewInteractionHit,
  type QuireViewLayerRef,
  type QuireViewPointerPolicy
} from "../../view-graph";
import type { CreateQuireDomOverlayHitTargetsOptions } from "../types";
import type { QuireHitTarget } from "../engine/types";

const domProxyLayer: QuireViewLayerRef = {
  plane: "dom-proxy"
};

const domProxyPointerPolicy: QuireViewPointerPolicy =
  resolveDefaultQuireViewPointerPolicyForLayer(domProxyLayer);

/**
 * Creates retained DOM-proxy targets from mounted DOM overlay descriptors.
 *
 * @param options - DOM overlays plus retained owner facts.
 * @returns Retained hit targets eligible for layer target routing.
 */
export function createQuireDomOverlayHitTargets(
  options: CreateQuireDomOverlayHitTargetsOptions
): readonly QuireHitTarget[] {
  if (
    options.viewRegion === undefined
    || options.source === undefined
    || options.capabilities === undefined
  ) {
    return [];
  }

  return options.overlays.map((overlay) => {
    const interactionHit = createQuireDomOverlayInteractionHit({
      overlayId: overlay.id,
      viewRegion: options.viewRegion,
      source: options.source,
      capabilities: options.capabilities
    });

    return {
      id: `${options.idPrefix}:${overlay.id}`,
      range: overlay.range,
      rect: overlay.rect,
      ...(options.viewRegion === undefined
        ? {}
        : { viewRegion: options.viewRegion }),
      layer: domProxyLayer,
      pointerPolicy: domProxyPointerPolicy,
      ...(interactionHit === undefined ? {} : { interactionHit })
    };
  });
}

/**
 * Creates retained interaction facts for a DOM overlay when an owner region exists.
 *
 * @param options - Overlay identity and retained owner facts.
 * @returns Control interaction hit, or undefined when no retained region is known.
 */
function createQuireDomOverlayInteractionHit(options: {
  /** Stable overlay id within the layout or render product. */
  readonly overlayId: string;
  /** Retained region inherited from the owning layout product. */
  readonly viewRegion: CreateQuireDomOverlayHitTargetsOptions["viewRegion"];
  /** Exact region-owned source inherited from the owning layout product. */
  readonly source: CreateQuireDomOverlayHitTargetsOptions["source"];
  /** Capabilities inherited from the owning layout product. */
  readonly capabilities: CreateQuireDomOverlayHitTargetsOptions["capabilities"];
}): QuireViewInteractionHit | undefined {
  if (
    options.viewRegion === undefined
    || options.source === undefined
    || options.capabilities === undefined
  ) {
    return undefined;
  }

  return {
    kind: "control",
    controlId: options.overlayId,
    region: options.viewRegion,
    layer: domProxyLayer,
    pointerPolicy: domProxyPointerPolicy,
    source: options.source,
    capabilities: options.capabilities
  };
}
