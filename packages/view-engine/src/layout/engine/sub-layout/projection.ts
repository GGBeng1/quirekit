import type {
  CreateQuireSubLayoutProjectionOptions,
  QuireSubLayoutDisplayChunkReference,
  QuireSubLayoutProjection
} from "./types";
import { createQuireSubLayoutQueryProductOwner } from "./owner";

/**
 * Attaches View-owned products to consumer-neutral child-flow geometry.
 *
 * @param options - Canonical geometry and explicit View sidecar products.
 * @returns View projection whose sidecar is keyed to the geometry result id.
 */
export function createQuireSubLayoutProjection(
  options: CreateQuireSubLayoutProjectionOptions
): QuireSubLayoutProjection {
  const projection: QuireSubLayoutProjection = {
    geometry: options.geometry,
    view: {
      resultId: options.geometry.id,
      root: options.root,
      fragmentSources: options.fragmentSources ?? [],
      queryProducts: options.queryProducts,
      displayChunks: []
    }
  };

  return {
    ...projection,
    view: {
      ...projection.view,
      displayChunks: options.displayChunks ??
        [createQuireSubLayoutDisplayChunkReference(projection)]
    }
  };
}

/**
 * Creates the retained display reference for one projected child-flow result.
 *
 * @param projection - Projection that owns retained paint and query products.
 * @returns Sub-layout-local display chunk reference.
 */
function createQuireSubLayoutDisplayChunkReference(
  projection: QuireSubLayoutProjection
): QuireSubLayoutDisplayChunkReference {
  const { geometry } = projection;
  const paintRootCommandId = resolveQuireSubLayoutPaintRootCommandId(projection);

  return {
    kind: "sub-layout-local",
    key: `${geometry.id}:display`,
    rect: geometry.contentClip,
    contentClip: geometry.contentClip,
    interactionClip: geometry.interactionClip,
    queryOwner: createQuireSubLayoutQueryProductOwner(projection),
    dependencySignature: geometry.dependencySignature,
    sourceBoxIds: projection.view.fragmentSources.map(
      (source) => source.sourceBox.id
    ),
    ...(paintRootCommandId === undefined
      ? {}
      : { paintRootCommandId }),
    ...(geometry.continuation?.pageIndex === undefined
      ? {}
      : { pageIndex: geometry.continuation.pageIndex })
  };
}

/**
 * Resolves the display command subtree that owns projected child-flow paint.
 *
 * @param projection - Projection whose paint root should be identified.
 * @returns Display command id, or undefined when no paint subtree is declared.
 */
function resolveQuireSubLayoutPaintRootCommandId(
  projection: QuireSubLayoutProjection
): string | undefined {
  return projection.geometry.root.kind === "table-cell"
    ? `${projection.geometry.root.placement.parentId}:clip`
    : undefined;
}
