import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelFreshness,
  ClassicEditorWorkspacePanelTarget
} from "../../types/workspace-panel";

/**
 * Validates one contribution before registration.
 *
 * @param contribution - Candidate typed contribution.
 */
export function assertWorkspacePanelContribution(
  contribution: ClassicEditorWorkspacePanelContribution
): void {
  if (contribution.id.trim().length === 0) {
    throw new RangeError("Classic Editor Workspace Panel contribution ids must not be empty.");
  }
  if (typeof contribution.mount !== "function") {
    throw new TypeError("Classic Editor Workspace Panel contributions must provide mount().");
  }
}

/**
 * Validates stable target identity without reading a live selection.
 *
 * @param target - Candidate target.
 */
export function assertWorkspacePanelTarget(
  target: ClassicEditorWorkspacePanelTarget
): void {
  if (
    target.id.trim().length === 0
    || target.ownerId.trim().length === 0
    || target.revision.trim().length === 0
  ) {
    throw new RangeError("Classic Editor Workspace Panel targets require stable identity, owner, and revision.");
  }
}

/**
 * Validates one owner-local monotonic freshness revision.
 *
 * @param freshness - Candidate freshness facts.
 */
export function assertWorkspacePanelFreshness(
  freshness: ClassicEditorWorkspacePanelFreshness
): void {
  if (!Number.isSafeInteger(freshness.revision) || freshness.revision < 0) {
    throw new RangeError("Classic Editor Workspace Panel freshness must be a non-negative safe integer.");
  }
}

/**
 * Compares complete stable identities so no live selection can replace the target.
 *
 * @param left - Retained stack target.
 * @param right - Feature-supplied update target.
 * @returns Whether both values identify the exact same retained target revision.
 */
export function haveSameWorkspacePanelTarget(
  left: ClassicEditorWorkspacePanelTarget,
  right: ClassicEditorWorkspacePanelTarget
): boolean {
  return left.kind === right.kind
    && left.id === right.id
    && left.ownerId === right.ownerId
    && left.revision === right.revision;
}

/**
 * Makes one plugin cleanup safe for duplicate unregister and destroy paths.
 *
 * @param cleanup - Plugin-owned connection cleanup.
 * @returns Idempotent cleanup.
 */
export function onceWorkspacePanelCleanup(cleanup: () => void): () => void {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    cleanup();
  };
}
