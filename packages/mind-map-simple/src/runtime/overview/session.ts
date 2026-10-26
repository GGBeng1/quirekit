import type { SimpleInstance } from "../../vendor/types";
import type { MindMapOverview } from "./types";
import { readMindMapOverview } from "./query";

/** @param instance - Owned geometry. @param changed - Constant-sized geometry invalidation.
 * @returns Lazy per-layout geometry index and its lifecycle. */
export function createMindMapOverview(instance: SimpleInstance, changed: () => void) {
  let version = 0, cached: MindMapOverview | undefined;
  /** Invalidates only geometry consumers; viewport frames never call this. */
  function rendered(): void { version++; cached = undefined; changed(); }
  instance.on("node_tree_render_end", rendered);
  return {
    /** @returns Current generation without walking nodes. */ version: () => version,
    /** @returns One immutable index reused until a later layout. */
    read: () => cached ??= readMindMapOverview(instance, version),
    /** Releases the geometry observer and its detached cache. */
    dispose(): void { instance.off("node_tree_render_end", rendered); cached = undefined; },
  };
}
