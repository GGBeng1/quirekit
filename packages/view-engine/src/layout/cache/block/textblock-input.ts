import type { QuireBlockLayoutInput } from "../../engine/block-types";
import { relocateQuireTextblockInput } from "./relocation/input";
import type {
  CanvasBlockInputCacheEntry,
  QuireTextblockCapabilityRevalidator,
  QuireTextblockFlowRebinder
} from "./types";

/**
 * Reads a reusable input from one textblock node's cached entries.
 *
 * Capability-bearing inputs are reused only after the collector re-resolves
 * their recorded capabilities at the current position and every placement is
 * unchanged; the fresh sidecars then replace the cached ones.
 *
 * @param entries - Cached entries of the node, most recent first.
 * @param request - Current width, id, content start and dependency variant.
 * @param rebind - Current collector authority used when source positions move.
 * @param revalidate - Current collector's capability revalidation, absent to refuse capability inputs.
 * @returns Reusable input, or undefined on a miss.
 */
export function readCanvasTextblockInput(
  entries: readonly CanvasBlockInputCacheEntry[],
  request: Pick<CanvasBlockInputCacheEntry, "width" | "id" | "contentStart" | "variant">,
  rebind?: QuireTextblockFlowRebinder,
  revalidate?: QuireTextblockCapabilityRevalidator
): QuireBlockLayoutInput | undefined {
  for (const entry of entries) {
    if (entry.width !== request.width || entry.id !== request.id || entry.variant !== request.variant) continue;
    const delta = request.contentStart - entry.contentStart;
    if ((entry.input.sourceCapabilities?.length ?? 0) === 0) return relocateQuireTextblockInput(entry.input, delta, rebind);
    const capabilities = entry.capabilities === undefined ? undefined : revalidate?.(entry.capabilities, delta);
    const input = capabilities === undefined ? undefined : relocateQuireTextblockInput(entry.input, delta, rebind, capabilities);
    if (input !== undefined) return input;
  }
  return undefined;
}

/**
 * Adds an entry, keeping at most one other capability variant of the same paragraph.
 *
 * Stored-text and candidate-text convergence passes give a field different
 * widths, so each paragraph keeps one entry per placement identity.
 *
 * @param entries - Current entries of the node, most recent first.
 * @param entry - Newly collected entry.
 * @returns Entries to retain for the node.
 */
export function appendCanvasTextblockInput(
  entries: readonly CanvasBlockInputCacheEntry[] | undefined,
  entry: CanvasBlockInputCacheEntry
): readonly CanvasBlockInputCacheEntry[] {
  const record = entry.capabilities;
  const other = record === undefined ? undefined : entries?.find((candidate) =>
    candidate.capabilities !== undefined && candidate.capabilities.placementKey !== record.placementKey
    && candidate.width === entry.width && candidate.id === entry.id && candidate.variant === entry.variant);
  return other === undefined ? [entry] : [entry, other];
}
