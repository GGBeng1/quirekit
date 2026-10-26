import type { QuireLayoutBox } from "../../../types";
import type { QuirePageBodyProjection } from "../types";
import { resolveQuireProjectionOccurrence } from "../occurrence";

// The index may outlive editors; it must never own their projected trees.
const projectedLayoutBoxListStore = new Map<string, WeakRef<readonly QuireLayoutBox[]>>();
const projectedLayoutBoxIdentityIds = new WeakMap<QuireLayoutBox, number>();
const maxProjectedLayoutBoxListEntries = 2048;
let nextProjectedLayoutBoxIdentityId = 1;

/**
 * Reads a still-owned projection without prolonging unused frame lifetimes.
 * @param signature - Exact source identities and page values.
 * @returns Live result, otherwise a cache miss requiring complete projection.
 */
export function readProjectedLayoutBoxes(signature: string): readonly QuireLayoutBox[] | undefined {
  const result = projectedLayoutBoxListStore.get(signature)?.deref();
  if (result === undefined) projectedLayoutBoxListStore.delete(signature);
  return result;
}

/**
 * Indexes a projection weakly; correctness and cleanup never depend on GC timing.
 * @param signature - Exact source identities and page values.
 * @param boxes - Result owned by the caller's current frame.
 */
export function retainProjectedLayoutBoxes(signature: string, boxes: readonly QuireLayoutBox[]): void {
  // Older engines keep the complete projection path instead of a strong cache.
  if (typeof WeakRef === "undefined") return;
  projectedLayoutBoxListStore.delete(signature);
  projectedLayoutBoxListStore.set(signature, new WeakRef(boxes));
  while (projectedLayoutBoxListStore.size > maxProjectedLayoutBoxListEntries) {
    projectedLayoutBoxListStore.delete(projectedLayoutBoxListStore.keys().next().value!);
  }
}

/**
 * Creates a signature for a layout-box sequence projected to page bodies.
 *
 * @param boxes - Source layout boxes in flow order.
 * @param projections - Page projections to apply.
 * @returns Stable signature for retained source boxes and projection values.
 */
export function createProjectedLayoutBoxesSignature(
  boxes: readonly QuireLayoutBox[],
  projections: readonly QuirePageBodyProjection[]
): string {
  let signature = `b${boxes.length}\u0000p${projections.length}`;

  for (let index = 0; index < boxes.length; index += 1) {
    signature += `\u0000${resolveProjectedLayoutBoxIdentityId(boxes[index]!)}`;
  }

  for (let index = 0; index < projections.length; index += 1) {
    const projection = projections[index]!;
    signature += `\u0000${resolveQuireProjectionOccurrence(projection)}`;
    signature += `\u0000${projection.page.range.from}`;
    signature += `\u0000${projection.page.range.to}`;
    signature += `\u0000${projection.dx}`;
    signature += `\u0000${projection.dy}`;
    signature += `\u0000${projection.page.pageRect.x}`;
    signature += `\u0000${projection.page.pageRect.y}`;
    signature += `\u0000${projection.page.pageRect.width}`;
    signature += `\u0000${projection.page.pageRect.height}`;
    signature += `\u0000${projection.page.bodyRect.x}`;
    signature += `\u0000${projection.page.bodyRect.y}`;
    signature += `\u0000${projection.page.bodyRect.width}`;
    signature += `\u0000${projection.page.bodyRect.height}`;
  }

  return signature;
}

/**
 * Resolves a stable id for a retained source layout box object.
 *
 * @param box - Layout box used in a projection input sequence.
 * @returns Stable numeric id for the layout box object.
 */
function resolveProjectedLayoutBoxIdentityId(box: QuireLayoutBox): number {
  const existing = projectedLayoutBoxIdentityIds.get(box);
  if (existing !== undefined) {
    return existing;
  }

  const next = nextProjectedLayoutBoxIdentityId;
  nextProjectedLayoutBoxIdentityId += 1;
  projectedLayoutBoxIdentityIds.set(box, next);
  return next;
}

