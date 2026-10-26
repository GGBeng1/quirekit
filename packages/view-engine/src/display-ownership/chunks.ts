import type { QuireDisplayCommand } from "@quirekit/renderer";
import type {
  QuireRetainedDisplayOwner,
  QuireRetainedDisplayOwnerChunk,
  QuireRetainedDisplayOwnerChunkCollector,
  QuireRetainedDisplayOwnerCommandSegment,
  QuireRetainedDisplayOwnerIndex,
  QuireRetainedDisplayOwnerLane,
  QuireRetainedDisplayPaintScope
} from "./types";

/**
 * Creates a direct command collector keyed by canonical retained display owners.
 *
 * Producers must provide both product identity and paint scope. This prevents a
 * repeated source, cross-page product, or overlay contribution from inheriting
 * ownership from whichever layout node happened to emit commands first.
 *
 * @param ownerIndex - Explicit owner index compiled from retained layout facts.
 * @returns Collector routing exact producer batches into content or overlay lanes.
 */
export function createQuireRetainedDisplayOwnerChunkCollector(
  ownerIndex: QuireRetainedDisplayOwnerIndex
): QuireRetainedDisplayOwnerChunkCollector {
  const ownerByProductScope = new Map<string, QuireRetainedDisplayOwner>();
  for (const owner of ownerIndex.owners) {
    ownerByProductScope.set(createProductScopeKey(owner.productId, owner.paintScope), owner);
  }

  // Appended in place: one owner may receive thousands of batches, such as search highlights.
  const contentCommandsByOwnerKey = new Map<string, QuireDisplayCommand[]>();
  const overlayCommandsByOwnerKey = new Map<string, QuireDisplayCommand[]>();
  const segmentsByOwnerKey = new Map<string, QuireRetainedDisplayOwnerCommandSegment[]>();
  let sequence = 0;

  return {
    append(batch) {
      if (batch.commands.length === 0) {
        return;
      }
      const owner = ownerByProductScope.get(
        createProductScopeKey(batch.productId, batch.paintScope)
      );
      if (owner === undefined) {
        return;
      }

      const commandGroups: Record<
        QuireRetainedDisplayOwnerLane,
        QuireDisplayCommand[]
      > = {
        content: [],
        overlay: []
      };
      for (const command of batch.commands) {
        commandGroups[
          resolveCommandLane(batch.paintScope, command)
        ].push(command);
      }

      // One direct producer may own persistent paper and editor-only guides.
      // Split that batch before retention so page chunks and composite lists
      // preserve the same explicit content/overlay boundary.
      for (const lane of ["content", "overlay"] as const) {
        const laneCommands = commandGroups[lane];
        if (laneCommands.length === 0) {
          continue;
        }
        const commandMap = lane === "content"
          ? contentCommandsByOwnerKey
          : overlayCommandsByOwnerKey;
        const currentCommands = commandMap.get(owner.key);
        if (currentCommands === undefined) commandMap.set(owner.key, [...laneCommands]);
        else currentCommands.push(...laneCommands);
        const segment = { lane, paintOrder: batch.paintOrder, sequence, commands: laneCommands };
        const segments = segmentsByOwnerKey.get(owner.key);
        if (segments === undefined) segmentsByOwnerKey.set(owner.key, [segment]);
        else segments.push(segment);
        sequence += 1;
      }
    },
    finish(bounds) {
      const chunks: QuireRetainedDisplayOwnerChunk[] = [];
      const chunksByOwnerKey: Record<string, QuireRetainedDisplayOwnerChunk> = {};

      for (const owner of ownerIndex.owners) {
        const chunk: QuireRetainedDisplayOwnerChunk = {
          owner,
          contentDisplayList: {
            bounds,
            commands: contentCommandsByOwnerKey.get(owner.key) ?? []
          },
          overlayDisplayList: {
            bounds,
            commands: overlayCommandsByOwnerKey.get(owner.key) ?? []
          },
          segments: segmentsByOwnerKey.get(owner.key) ?? []
        };
        chunks.push(chunk);
        chunksByOwnerKey[owner.key] = chunk;
      }

      return { chunks, chunksByOwnerKey };
    }
  };
}

/**
 * Creates the lookup key shared by owner compilation and command collection.
 *
 * @param productId - Stable retained product identity.
 * @param paintScope - Exact retained paint responsibility.
 * @returns Collision-safe product/scope lookup key.
 */
function createProductScopeKey(
  productId: string,
  paintScope: QuireRetainedDisplayPaintScope
): string {
  return `${paintScope.length}:${paintScope}:${productId}`;
}

/**
 * Resolves the one command lane owned by a producer paint scope.
 *
 * @param paintScope - Exact producer paint responsibility.
 * @returns Content or overlay lane receiving the producer commands.
 */
function resolvePaintScopeLane(
  paintScope: QuireRetainedDisplayPaintScope
): QuireRetainedDisplayOwnerLane {
  return paintScope.endsWith("-overlay") ? "overlay" : "content";
}

/**
 * Resolves the retained lane for one directly produced command.
 *
 * An explicit command layer refines a mixed producer such as page chrome.
 * Commands without a layer retain their producer paint-scope default.
 *
 * @param paintScope - Exact producer paint responsibility.
 * @param command - Direct command emitted by that producer.
 * @returns Content or overlay lane receiving the command.
 */
function resolveCommandLane(
  paintScope: QuireRetainedDisplayPaintScope,
  command: QuireDisplayCommand
): QuireRetainedDisplayOwnerLane {
  return command.layer ?? resolvePaintScopeLane(paintScope);
}
