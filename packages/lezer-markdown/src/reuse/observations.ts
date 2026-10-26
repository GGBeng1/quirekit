import type { Tree } from "@lezer/common";
import type { BlockReuse, BlockReuseOrigins } from "./types";

// Both generations are weak keys; observing reuse never retains version chains.
const blockReuse = new WeakMap<Tree, BlockReuse>();

/**
 * Retains native adoption evidence only for an accepted complete root.
 * @param tree - Accepted root.
 * @param origins - Weak fragment origins with committed ranges.
 * @param count - Number of adoption events.
 */
export function retainBlockReuse(tree: Tree, origins: BlockReuseOrigins, count: number): void {
  blockReuse.set(tree, Object.freeze({
    count,
    /** @param previous - Exact old root. @returns Frozen ranges, if present. */
    get(previous: Tree) {
      const ranges = origins.get(previous);
      return ranges && Object.freeze(ranges);
    },
  }));
}

/**
 * Reads optional root-level reuse after native context checks and tail rollback.
 * @param tree - Final root.
 * @returns Complete root-level evidence, when observed.
 */
export function getBlockReuse(tree: Tree): BlockReuse | undefined {
  return blockReuse.get(tree);
}
