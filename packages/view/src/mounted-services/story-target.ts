import {
  createQuireInteractionGeometryAuthority,
  resolveQuireInteractionNearestCaretAtPoint,
  resolveQuireHitTestSelectionTarget,
  type QuireInteractionSelectionTarget,
  type QuireLayoutNode,
  type QuireLayoutSnapshot
} from "@quirekit/view-engine";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";

/** Auxiliary story regions that a mounted service may activate programmatically. */
const activatableStoryRegions = new Set(["header", "footer", "footnote", "endnote"]);

/** One page-local visual occurrence of an auxiliary story containing a position. */
export interface MountedStoryInstance {
  /** Region carrying the kind and page-local visual identity. */
  readonly region: QuireLayoutRegionRef;
  /** Stable story source shared by every occurrence. */
  readonly sourceId: string;
  /** Document range covered by this occurrence's outermost container. */
  readonly range: QuireDocumentRange;
  /** Outermost container rectangle in document coordinates. */
  readonly rect: QuireRect;
}

/** Interaction target resolved for a programmatic story activation. */
export interface MountedStoryTextTarget {
  /** Target equivalent to a pointer hit on the chosen occurrence. */
  readonly target: QuireInteractionSelectionTarget;
  /** Occurrence the target belongs to. */
  readonly instance: MountedStoryInstance;
}

/**
 * Lists the auxiliary story occurrences that contain a document position.
 *
 * Traversal is depth-first, so the first node seen for an occurrence is its
 * outermost container; nested lines and runs of the same occurrence are skipped.
 *
 * @param snapshot - Interaction geometry snapshot.
 * @param position - Document position inside the story.
 * @returns Occurrences in layout order.
 */
export function listMountedStoryInstances(
  snapshot: QuireLayoutSnapshot,
  position: number
): MountedStoryInstance[] {
  const instances = new Map<string, MountedStoryInstance>();
  const visit = (nodes: readonly QuireLayoutNode[]): void => {
    for (const node of nodes) {
      const owner = node.layoutOwner;
      if (node.range.from > position || node.range.to < position) continue;
      if (owner !== undefined && activatableStoryRegions.has(owner.region.kind)) {
        const key = owner.region.visualInstanceId ?? node.id;
        if (!instances.has(key)) {
          instances.set(key, { region: owner.region, sourceId: owner.source.sourceId,
            range: node.range, rect: node.rect });
        }
        continue;
      }
      visit(node.children ?? []);
    }
  };
  visit(snapshot.root.children ?? []);
  return [...instances.values()];
}

/**
 * Picks the occurrence closest to the current viewport.
 *
 * @param instances - Candidate occurrences.
 * @param viewport - Visible document rectangle.
 * @returns Nearest occurrence, or undefined when there are none.
 */
export function pickNearestMountedStoryInstance(
  instances: readonly MountedStoryInstance[],
  viewport: QuireRect
): MountedStoryInstance | undefined {
  const centerY = viewport.y + viewport.height / 2;
  let nearest: MountedStoryInstance | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const instance of instances) {
    const distance = Math.abs(instance.rect.y + instance.rect.height / 2 - centerY);
    if (distance < nearestDistance) {
      nearest = instance;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * Resolves explicit text navigation within one retained Story occurrence.
 * @param snapshot - Interaction geometry snapshot.
 * @param position - Document position inside the story.
 * @returns Scoped text target and its occurrence, or null without matching ownership.
 */
export function resolveMountedStoryTextTarget(
  snapshot: QuireLayoutSnapshot,
  position: number
): MountedStoryTextTarget | null {
  const instance = pickNearestMountedStoryInstance(
    listMountedStoryInstances(snapshot, position),
    snapshot.viewportRect
  );
  if (instance === undefined) return null;
  const authority = createQuireInteractionGeometryAuthority({ snapshot });
  const caret = authority.coordsAtPos(position, 1, { viewRegion: instance.region });
  if (caret.source !== "layout-caret") return null;
  // Explicit text navigation already owns an occurrence. Query its text rather
  // than the global controls plane, which can cover the first empty caret.
  const hit = resolveQuireInteractionNearestCaretAtPoint({
    snapshot,
    region: instance.region,
    point: { x: caret.rect.x + caret.rect.width / 2, y: caret.rect.y + caret.rect.height / 2 }
  });
  if (hit.kind === "miss") return null;
  const target = resolveQuireHitTestSelectionTarget({ hitTestResult: { ...hit, kind: "position" } });
  const owner = target?.region !== undefined && activatableStoryRegions.has(target.region.kind)
    ? { region: target.region, source: target.source }
    : target?.interactionScope;
  return target !== null
    && owner?.region.kind === instance.region.kind
    && owner.source?.sourceId === instance.sourceId
    && owner.region.visualInstanceId === instance.region.visualInstanceId
    ? { target, instance } : null;
}
