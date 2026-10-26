import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireLayoutProvider as QuirePublicLayoutProvider,
  QuireLayoutProviderContext as QuirePublicLayoutProviderContext
} from "../../layout-provider";
import type {
  QuireLayoutProvider,
  QuireLayoutProviderContext,
  QuireLayoutProviderOutput
} from "../../layout/providers/types";

/**
 * Adapts one plugin-facing provider to the authority-owned execution contract.
 *
 * Public provider types intentionally hide internal layout products. Keeping
 * the conversion here prevents registration shape checks from silently
 * treating the two same-named contexts as interchangeable.
 *
 * @param provider - Provider authored through the public layout-provider leaf.
 * @returns Internal provider that explicitly projects every execution context.
 */
export function adaptQuireExternalLayoutProvider(
  provider: QuirePublicLayoutProvider
): QuireLayoutProvider {
  return {
    id: provider.id,
    nodeTypes: provider.nodeTypes,
    capabilities: provider.capabilities,
    regionContract: provider.regionContract,
    layout: (context) => provider.layout(
      createPublicProviderContext(context)
    ) as unknown as QuireLayoutProviderOutput
  };
}

/**
 * Projects the internal source and services into the public authoring context.
 *
 * @param context - Canonical internal provider execution context.
 * @returns Public context carrying the exact source node and opaque services.
 */
function createPublicProviderContext(
  context: QuireLayoutProviderContext
): QuirePublicLayoutProviderContext {
  const sourceNode = requireProseMirrorSourceNode(context.sourceIdentity);
  const services = createPublicProviderServices(context.services);
  const root = requirePublicProviderRoot(context.root);
  const constraints = requirePublicProviderConstraints(context.constraints);

  return {
    providerId: context.providerId,
    snapshotVersion: context.snapshotVersion,
    source: context.source,
    sourceNode,
    sourcePath: context.sourcePath,
    sourceContentStart: context.sourceContentStart,
    root,
    region: context.region,
    visualInstance: context.visualInstance,
    constraints,
    services,
    ...(context.previousContinuation === undefined
      ? {}
      : {
          previousContinuation: context.previousContinuation as unknown as
            NonNullable<QuirePublicLayoutProviderContext["previousContinuation"]>
        }),
    job: context.job
  };
}

/**
 * Adapts public request names and opaque return types to internal services.
 *
 * @param services - Authority-owned services for the active execution.
 * @returns Public authoring services backed by the same execution authority.
 */
function createPublicProviderServices(
  services: QuireLayoutProviderContext["services"]
): QuirePublicLayoutProviderContext["services"] {
  return {
    compileLayerContribution: services.compileLayerContribution as unknown as
      QuirePublicLayoutProviderContext["services"]["compileLayerContribution"],
    declarePrimaryRegion: services.declarePrimaryRegion as unknown as
      QuirePublicLayoutProviderContext["services"]["declarePrimaryRegion"],
    declareRegionProducts: services.declareRegionProducts as unknown as
      QuirePublicLayoutProviderContext["services"]["declareRegionProducts"],
    collectBlockInputs: (request) => services.collectBlockInputs({
      sourceIdentity: request.node,
      contentStart: request.contentStart,
      path: request.path,
      inlineSize: request.inlineSize
    }) as unknown as ReturnType<
      QuirePublicLayoutProviderContext["services"]["collectBlockInputs"]
    >,
    layoutBlockContainer: services.layoutBlockContainer as unknown as
      QuirePublicLayoutProviderContext["services"]["layoutBlockContainer"],
    placeBlockContainer: services.placeBlockContainer as unknown as
      QuirePublicLayoutProviderContext["services"]["placeBlockContainer"],
    flowBlockChildren: services.flowBlockChildren as unknown as
      QuirePublicLayoutProviderContext["services"]["flowBlockChildren"],
    allocateRootRegion: services.allocateRootRegion as unknown as
      QuirePublicLayoutProviderContext["services"]["allocateRootRegion"],
    createContribution: services.createContribution as unknown as
      QuirePublicLayoutProviderContext["services"]["createContribution"]
  };
}

/**
 * Narrows an internal root to the root kinds promised by the public API.
 *
 * @param root - Internal retained root selected for provider execution.
 * @returns Root accepted by the plugin-facing provider contract.
 */
function requirePublicProviderRoot(
  root: QuireLayoutProviderContext["root"]
): QuirePublicLayoutProviderContext["root"] {
  if (root.kind === "drawing") {
    throw new TypeError(
      "External layout provider execution does not support drawing roots."
    );
  }
  return {
    id: root.id,
    kind: root.kind as QuirePublicLayoutProviderContext["root"]["kind"],
    source: root.source,
    capabilities: root.capabilities
  };
}

/**
 * Narrows internal-only flow coordinates before plugin-facing execution.
 *
 * @param constraints - Parent-owned internal layout constraints.
 * @returns Constraints accepted by the plugin-facing provider contract.
 */
function requirePublicProviderConstraints(
  constraints: QuireLayoutProviderContext["constraints"]
): QuirePublicLayoutProviderContext["constraints"] {
  if (
    constraints.coordinateSpace === "source-flow"
    || constraints.coordinateSpace === "sub-layout-local"
  ) {
    throw new TypeError(
      `External layout provider execution does not support ${constraints.coordinateSpace} coordinates.`
    );
  }
  return {
    origin: constraints.origin,
    inlineSize: constraints.inlineSize,
    blockSize: constraints.blockSize,
    blockHeight: constraints.blockHeight,
    blockGap: constraints.blockGap,
    coordinateSpace: constraints.coordinateSpace as
      QuirePublicLayoutProviderContext["constraints"]["coordinateSpace"]
  };
}

/**
 * Requires the exact ProseMirror source guaranteed by editor block collection.
 *
 * @param sourceIdentity - Internal immutable source identity.
 * @returns Source identity narrowed to the public ProseMirror node contract.
 */
function requireProseMirrorSourceNode(
  sourceIdentity: object
): ProseMirrorNode {
  const candidate = sourceIdentity as Partial<ProseMirrorNode>;
  if (
    typeof candidate.forEach !== "function"
    || typeof candidate.nodeSize !== "number"
    || typeof candidate.type?.name !== "string"
  ) {
    throw new TypeError(
      "External layout provider execution requires an exact ProseMirror source node."
    );
  }
  return sourceIdentity as ProseMirrorNode;
}
