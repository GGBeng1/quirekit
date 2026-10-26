import {
  createQuireChildFlowResult,
  type QuireChildFlowContinuation,
  type QuireChildFlowFragment,
  type QuireChildFlowRoot,
  type QuireChildFlowSourceBand,
  type QuireChildFlowTransform
} from "@quirekit/layout/child-flow";
import type { QuireLayoutCoordinateSpaceKind } from "@quirekit/layout/identity";
import type { QuireRect } from "@quirekit/renderer";
import {
  createQuireSubLayoutProjection,
  type QuireSubLayoutDisplayChunkReference,
  type QuireSubLayoutFragmentSource,
  type QuireSubLayoutProjection,
  type QuireSubLayoutQueryProducts,
  type QuireSubLayoutRootViewProducts
} from "../../src/layout/engine/sub-layout";

/** Canonical inputs for one View sub-layout projection test fixture. */
export interface CreateQuireTestSubLayoutProjectionOptions {
  /** Consumer-neutral child-flow root represented by the fixture. */
  readonly root: QuireChildFlowRoot;
  /** Stable visual result identity. */
  readonly resultId: string;
  /** Optional visual track identity. */
  readonly trackId?: string | undefined;
  /** Source-flow band accepted by the result. */
  readonly acceptedBand: QuireChildFlowSourceBand;
  /** Optional accepted child fragments. */
  readonly fragments?: readonly QuireChildFlowFragment[] | undefined;
  /** Translation from root-local coordinates into result coordinates. */
  readonly localToResult: QuireChildFlowTransform;
  /** Optional result coordinate space. */
  readonly coordinateSpace?: QuireLayoutCoordinateSpaceKind | undefined;
  /** Result-space content clip. */
  readonly contentClip: QuireRect;
  /** Result-space interaction clip. */
  readonly interactionClip: QuireRect;
  /** Optional continuation state; omitted fixtures are terminal. */
  readonly continuation?: QuireChildFlowContinuation | null | undefined;
  /** Optional dependency signature override. */
  readonly dependencySignature?: string | undefined;
  /** Optional dependency checkpoints. */
  readonly dependencyCheckpoints?: Readonly<Record<string, unknown>> | undefined;
  /** Optional View products attached to the root. */
  readonly viewRoot?: QuireSubLayoutRootViewProducts | undefined;
  /** Optional source-box provenance keyed by fragment identity. */
  readonly fragmentSources?: readonly QuireSubLayoutFragmentSource[] | undefined;
  /** Optional interaction query products. */
  readonly queryProducts?: QuireSubLayoutQueryProducts | undefined;
  /** Optional retained display chunk references. */
  readonly displayChunks?: readonly QuireSubLayoutDisplayChunkReference[] | undefined;
}

/**
 * Creates a canonical child-flow geometry result with its View sidecar for tests.
 *
 * @param options - Complete geometry identity plus optional View-owned products.
 * @returns Canonical sub-layout projection used by View tests.
 */
export function createQuireTestSubLayoutProjection(
  options: CreateQuireTestSubLayoutProjectionOptions
): QuireSubLayoutProjection {
  const geometry = createQuireChildFlowResult({
    id: options.resultId,
    trackId: options.trackId ?? `${options.resultId}:track`,
    root: options.root,
    acceptedBand: options.acceptedBand,
    fragments: options.fragments ?? [],
    localToResult: options.localToResult,
    coordinateSpace: options.coordinateSpace ?? "document",
    contentClip: options.contentClip,
    interactionClip: options.interactionClip,
    continuation: options.continuation ?? null,
    dependencySignature: options.dependencySignature ??
      options.root.dependencySignature,
    ...(options.dependencyCheckpoints === undefined
      ? {}
      : { dependencyCheckpoints: options.dependencyCheckpoints })
  });

  return createQuireSubLayoutProjection({
    geometry,
    root: options.viewRoot ?? { ownership: { status: "unclaimed" } },
    fragmentSources: options.fragmentSources,
    queryProducts: options.queryProducts ?? createEmptyQueryProducts(),
    displayChunks: options.displayChunks
  });
}

/**
 * Creates empty interaction products for geometry-only test fixtures.
 *
 * @returns Empty selection, caret, hit-test, and input-anchor products.
 */
function createEmptyQueryProducts(): QuireSubLayoutQueryProducts {
  return {
    selectionRects: [],
    caretStops: [],
    hitTargets: [],
    inputAnchors: []
  };
}
