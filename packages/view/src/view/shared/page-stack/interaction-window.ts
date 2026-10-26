import type { ResolveMountedPageStackInteractionBlockLimitOptions } from "./types";

/**
 * Resolves the prefix block limit for one interaction-critical page-stack pass.
 *
 * The layout collector currently owns prefix-bounded exact shaping. This policy
 * therefore includes the dirty block plus one viewport-sized forward window,
 * while leaving near-document-end edits on the ordinary exact path when no
 * meaningful downstream remainder can be deferred.
 *
 * @param options - Document size, dirty block identity, and viewport block window.
 * @returns Exclusive top-level block limit, or undefined when bounding cannot reduce work.
 */
export function resolveMountedPageStackInteractionBlockLimit(
  options: ResolveMountedPageStackInteractionBlockLimitOptions
): number | undefined {
  const totalBlockCount = Math.max(0, Math.floor(options.totalBlockCount));
  const blockWindowSize = Math.max(1, Math.floor(options.blockWindowSize));
  const firstDirtyBlockIndex = Math.min(
    Math.max(0, Math.floor(options.firstDirtyBlockIndex)),
    Math.max(0, totalBlockCount - 1)
  );
  const blockLimit = Math.min(
    totalBlockCount,
    Math.max(blockWindowSize, firstDirtyBlockIndex + blockWindowSize)
  );

  return blockLimit < totalBlockCount ? blockLimit : undefined;
}
