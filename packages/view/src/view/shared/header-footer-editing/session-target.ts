import type { QuireInteractionSelectionTarget } from "@quirekit/view-engine";
import type {
  MountedHeaderFooterEditingRegion,
  MountedHeaderFooterEditingSession
} from "./types";

/**
 * Extracts the stable story, command-owner, and visual identities required by editing mode.
 *
 * @param target - Retained interaction target to classify.
 * @returns Session descriptor, or null for body/incomplete targets.
 */
export function resolveHeaderFooterTarget(
  target: QuireInteractionSelectionTarget | null
): MountedHeaderFooterEditingSession | null {
  const directRegion = target?.region;
  const owner = isHeaderFooterRegion(directRegion?.kind)
    ? {
        region: directRegion,
        source: target?.source
      }
    : target?.interactionScope;
  const region = owner?.region.kind;
  const sourceId = owner?.source?.sourceId;
  const visualInstanceId = owner?.region.visualInstanceId;
  const commandOwner = owner?.region.commandOwner;

  if (
    !isHeaderFooterRegion(region)
    || sourceId === undefined
    || visualInstanceId === undefined
  ) {
    return null;
  }

  return {
    sourceId,
    region,
    visualInstanceId,
    ...(commandOwner === undefined ? {} : { commandOwner })
  };
}

/**
 * Compares stable story ownership while allowing repeated visual occurrences.
 *
 * @param active - Current view-local editing session.
 * @param candidate - Target-derived session descriptor.
 * @returns Whether both descriptors identify the same story, band, and command owner.
 */
export function matchesHeaderFooterSession(
  active: MountedHeaderFooterEditingSession | null,
  candidate: MountedHeaderFooterEditingSession | null
): boolean {
  return active !== null
    && candidate !== null
    && active.sourceId === candidate.sourceId
    && active.region === candidate.region
    && matchesCommandOwner(active.commandOwner, candidate.commandOwner);
}

/**
 * Checks whether a layout region participates in explicit story editing.
 *
 * @param region - Layout region kind to classify.
 * @returns Whether the region is a header or footer.
 */
function isHeaderFooterRegion(
  region: string | undefined
): region is MountedHeaderFooterEditingRegion {
  return region === "header" || region === "footer";
}

/**
 * Compares structural command ownership independently of visual occurrence.
 *
 * @param active - Command owner retained by the current session.
 * @param candidate - Command owner carried by a new retained target.
 * @returns Whether both targets belong to the same structural command owner.
 */
function matchesCommandOwner(
  active: MountedHeaderFooterEditingSession["commandOwner"],
  candidate: MountedHeaderFooterEditingSession["commandOwner"]
): boolean {
  if (active === undefined || candidate === undefined) {
    return active === candidate;
  }

  return active.position === candidate.position
    && active.nodeType === candidate.nodeType
    && active.stableId === candidate.stableId;
}
