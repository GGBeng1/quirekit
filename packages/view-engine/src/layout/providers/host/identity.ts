import type {
  ExecuteQuireLayoutProviderHostOptions,
  QuireLayoutProviderRootRegionIdentity,
  QuireLayoutProviderRootRegionIdentityRequest
} from "../types";
import type {
  QuireLayoutRegionRef,
  QuireLayoutRoot,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";

/**
 * Allocates deterministic retained identity from explicit provider facts.
 *
 * @param request - Provider id, source, local key, and complete region policy.
 * @returns Framework-owned root, region, and declaration.
 */
export function allocateQuireLayoutProviderRootRegion(
  request: QuireLayoutProviderRootRegionIdentityRequest & {
    /** Provider authority allocating the retained address. */
    readonly providerId: string;
  }
): QuireLayoutProviderRootRegionIdentity {
  const rootId = `root:provider:${request.providerId}:${request.source.sourceId}:${request.localId}`;
  const regionId = `region:provider:${request.providerId}:${request.source.sourceId}:${request.localId}`;
  const root: QuireLayoutRoot = {
    id: { value: rootId },
    kind: request.rootKind,
    source: request.source,
    capabilities: request.capabilities
  };
  const region: QuireLayoutRegionRef = {
    rootId: root.id,
    regionId: { value: regionId },
    kind: request.regionKind,
    ...(request.visualInstance?.kind !== "repeated"
      ? {}
      : { visualInstanceId: request.visualInstance.visualInstanceId })
  };

  return {
    root,
    region,
    declaration: {
      providerId: request.providerId,
      sourceKind: request.sourceKind,
      source: request.source,
      root: {
        rootId,
        kind: request.rootKind,
        source: request.source,
        capabilities: request.capabilities
      },
      regions: [{
        regionId,
        kind: request.regionKind,
        source: request.source,
        rect: request.rect,
        coordinateSpace: request.coordinateSpace,
        visualInstance: request.visualInstance === undefined
          ? undefined
          : request.visualInstance.kind === "single"
            ? { kind: "single" }
            : {
                kind: "repeated",
                visualInstanceId: request.visualInstance.visualInstanceId
              },
        capabilities: request.capabilities
      }],
      selectionPolicies: [{
        policyId: `${regionId}:selection`,
        regionId,
        kind: request.selectionPolicy
      }]
    }
  };
}

/**
 * Creates the source identity owned by the framework block collector.
 *
 * @param options - Provider host options.
 * @returns Source id and exact document range for the provider execution.
 */
export function createQuireLayoutProviderSource(
  options: ExecuteQuireLayoutProviderHostOptions
): QuireLayoutSourceRef {
  return {
    sourceId: `document-node:${options.id}`,
    range: options.range
  };
}

/**
 * Projects tagged provider constraints to an initial region rectangle.
 *
 * @param options - Provider host options.
 * @returns Parent-space rectangle with explicit bounded or initial height.
 */
export function createQuireLayoutProviderConstraintRect(
  options: ExecuteQuireLayoutProviderHostOptions
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return {
    x: options.constraints.origin.x,
    y: options.constraints.origin.y,
    width: options.constraints.inlineSize,
    height: options.constraints.blockSize.kind === "bounded"
      ? options.constraints.blockSize.size
      : options.constraints.blockHeight
  };
}
