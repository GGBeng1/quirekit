import { compileQuireRetainedLayerContributionView } from "../../region-products";
import type {
  QuireLayoutProviderLayerContributionRequest,
  QuireRetainedLayerContributionDeclaration
} from "../../region-products";

/**
 * Compiles one neutral view tree during versioned provider layout.
 *
 * The returned declaration names only the exact retained region. Canonical
 * compilation binds source and capability facts from that region afterward.
 *
 * @param request - Explicit owner, geometry, layer, and neutral view tree.
 * @returns Renderer-neutral declaration ready for retained product compilation.
 */
export function compileQuireLayoutProviderLayerContribution(
  request: QuireLayoutProviderLayerContributionRequest
): QuireRetainedLayerContributionDeclaration {
  if (request.owner.region.rootId.value !== request.owner.root.id.value) {
    throw new Error("Layer contribution owner root and region must match.");
  }

  return compileQuireRetainedLayerContributionView({
    contributionId: request.contributionId,
    rootId: request.owner.root.id.value,
    regionId: request.owner.region.regionId.value,
    ...(request.owner.region.visualInstanceId === undefined
      ? {}
      : { visualInstanceId: request.owner.region.visualInstanceId }),
    range: request.range,
    rect: request.rect,
    ...(request.visualBounds === undefined
      ? {}
      : { visualBounds: request.visualBounds }),
    layer: request.layer,
    paintSurface: request.paintSurface,
    ...(request.activation === undefined ? {} : { activation: request.activation }),
    node: request.node
  });
}
