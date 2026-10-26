import { resolveQuireSubLayoutInputAnchor } from "../sub-layout-query";
import type {
  QuireInteractionInputAnchorOptions,
  QuireInteractionInputAnchorResult
} from "./types";

/**
 * Resolves an input anchor from retained interaction geometry.
 *
 * @param options - Snapshot, document position, and requested input role.
 * @returns Retained input anchor with provenance, or null when none matches.
 */
export function resolveQuireInteractionInputAnchor(
  options: QuireInteractionInputAnchorOptions
): QuireInteractionInputAnchorResult | null {
  const anchor = resolveQuireSubLayoutInputAnchor(
    options.snapshot.root.children ?? [],
    options.position,
    options.role,
    options.referenceRect
  );

  if (anchor === null) {
    return null;
  }

  const snapshotVersion = options.snapshot.viewGraph?.version;

  return {
    rect: anchor.rect,
    source: "sub-layout-input-anchor",
    ...(anchor.queryOwner === undefined ? {} : { queryOwner: anchor.queryOwner }),
    ...(anchor.queryOwner?.region === undefined
      ? {}
      : { viewRegion: anchor.queryOwner.region }),
    ...(snapshotVersion === undefined ? {} : { snapshotVersion })
  };
}
