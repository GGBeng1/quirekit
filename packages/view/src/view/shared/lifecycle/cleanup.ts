import type { MountedViewCleanupRegistry } from "./types";

/**
 * Creates the cleanup authority for one mounted view lifecycle.
 *
 * Cleanup runs in reverse registration order because later bindings commonly
 * depend on surfaces or runtimes registered earlier in the mount sequence.
 *
 * @returns Registry that owns and releases mounted cleanup callbacks.
 */
export function createMountedViewCleanupRegistry(): MountedViewCleanupRegistry {
  const cleanups: Array<() => void> = [];
  let destroyed = false;

  return {
    add(cleanup): void {
      if (destroyed) {
        cleanup();
        return;
      }

      cleanups.push(cleanup);
    },
    destroy(): void {
      if (destroyed) {
        return;
      }

      destroyed = true;
      for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
      }
    }
  };
}
