import type {
  QuireLayoutProviderContainerPlacementRequest,
  QuireLayoutProviderContributionRequest,
  QuireLayoutProviderServices as QuirePublicLayoutProviderServices
} from "../../../layout-provider/types";
import type { QuireLayoutBox, QuireLayoutContainer } from "../../engine";
import type { QuireSubLayoutProjection } from "../../engine/sub-layout";
import type {
  QuireLayoutProviderRegionDeclaration,
  QuireLayoutProviderRegionProductsRequest
} from "../types";
import type {
  QuireRetainedLayerContributionDeclaration
} from "../../region-products";
import type {
  QuireLayoutRegionRef,
  QuireLayoutRoot
} from "@quirekit/layout/identity";
import { compileQuireLayoutProviderInteractionTarget } from "./interaction-target";

/** Public return type for a relocated opaque provider container. */
type PublicPlacedContainer = ReturnType<
  QuirePublicLayoutProviderServices["placeBlockContainer"]
>;

/** Public return type for an opaque provider contribution. */
type PublicContribution = ReturnType<
  QuirePublicLayoutProviderServices["createContribution"]
>;

/**
 * Relocates a framework-created container and optionally installs exact ownership.
 *
 * @param request - Opaque container, accepted rectangle, and optional owner.
 * @returns Opaque container backed by the canonical internal layout object.
 */
export function placeQuireLayoutProviderBlockContainer(
  request: QuireLayoutProviderContainerPlacementRequest
): PublicPlacedContainer {
  const container = request.container as unknown as QuireLayoutContainer;
  const owner = request.owner;
  const placed: QuireLayoutContainer = {
    ...container,
    rect: request.rect,
    ...(owner === undefined
      ? {}
      : {
          viewRoot: owner.root as QuireLayoutRoot,
          viewRegion: owner.region as QuireLayoutRegionRef,
          viewCapabilities: owner.root.capabilities,
          layoutOwner: {
            region: owner.region as QuireLayoutRegionRef,
            source: owner.root.source,
            capabilities: owner.root.capabilities
          }
        })
  };
  return placed as unknown as PublicPlacedContainer;
}

/**
 * Constructs the canonical layout box behind one opaque provider contribution.
 *
 * @param request - Exact owner, geometry, framework children, and fragments.
 * @returns Opaque contribution accepted by provider compilation authority.
 */
export function createQuireLayoutProviderContribution(
  request: QuireLayoutProviderContributionRequest
): PublicContribution {
  const content = request.content as unknown as QuireLayoutContainer | undefined;
  const contribution: QuireLayoutBox = {
    ...(content ?? {}),
    id: request.id,
    range: request.range,
    rect: request.rect,
    ...(request.children === undefined
      ? {}
      : { children: request.children as unknown as readonly QuireLayoutBox[] }),
    ...(request.fragments === undefined
      ? {}
      : {
          subLayoutFragments: (
            request.fragments as unknown as readonly QuireSubLayoutProjection[]
          ).map((fragment) => ({ subLayout: fragment }))
        }),
    viewRoot: request.owner.root as QuireLayoutRoot,
    viewRegion: request.owner.region as QuireLayoutRegionRef,
    viewCapabilities: request.owner.root.capabilities,
    layoutOwner: {
      region: request.owner.region as QuireLayoutRegionRef,
      source: request.owner.root.source,
      capabilities: request.owner.root.capabilities
    },
    ...(request.exportFallbacks === undefined
      ? {}
      : { exportFallbacks: request.exportFallbacks })
  };
  return contribution as unknown as PublicContribution;
}

/**
 * Attaches provider products to a framework-created retained declaration.
 *
 * The service translates public interaction intent into the canonical retained
 * hit shape while preserving the exact root, region, source, and capabilities.
 *
 * @param request - Opaque declaration, exact owner, and provider products.
 * @returns Opaque declaration accepted by the retained product compiler.
 */
export function declareQuireLayoutProviderRegionProducts(
  request: QuireLayoutProviderRegionProductsRequest
): QuireLayoutProviderRegionDeclaration {
  const declaration = request.declaration;
  const exportFallbacks = request.exportFallbacks;
  const semantics = request.semantics;
  const hasConsumerProducts = semantics !== undefined || exportFallbacks !== undefined;
  const productDeclaration: QuireLayoutProviderRegionDeclaration = {
    ...declaration,
    ...(request.layerContributions === undefined
      ? {}
      : {
          layerContributions: request.layerContributions as unknown as readonly
            QuireRetainedLayerContributionDeclaration[]
        }),
    ...(request.interactionTargets === undefined
      ? {}
      : {
          layerTargets: request.interactionTargets.map((target) =>
            compileQuireLayoutProviderInteractionTarget(target, request.owner)
          )
        }),
    ...(!hasConsumerProducts
      ? {}
      : {
          root: declaration.root === undefined
            ? undefined
            : {
                ...declaration.root,
                ...(semantics === undefined ? {} : { semantics }),
                ...(exportFallbacks === undefined ? {} : { exportFallbacks })
              },
          regions: declaration.regions?.map((entry) => ({
            ...entry,
            ...(semantics === undefined ? {} : { semantics }),
            ...(exportFallbacks === undefined ? {} : { exportFallbacks })
          }))
        })
  };
  return productDeclaration;
}
