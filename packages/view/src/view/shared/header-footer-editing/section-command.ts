import type { QuireEditor } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { resolveQuireDocumentProfile } from "@quirekit/view-engine";
import type { MountedHeaderFooterEditingSession } from "./types";

/**
 * Reads the active region's edge distance from its exact structural owner.
 *
 * @param editor - Editor containing the current document state.
 * @param session - Mounted story session carrying transient command ownership.
 * @returns Validated distance in twips, or null for stale/incomplete ownership.
 */
export function readMountedHeaderFooterDistanceTwips(
  editor: QuireEditor,
  session: MountedHeaderFooterEditingSession
): number | null {
  const node = resolveCommandOwnerNode(editor, session);
  return node === null
    ? null
    : resolveQuireDocumentProfile(editor.extensionManager).pageModel.readBandDistanceSetting(node, session.region);
}

/**
 * Applies a distance change through the document's page model.
 *
 * @param editor - Editor receiving the section transaction.
 * @param session - Mounted story session carrying exact section ownership.
 * @param distanceTwips - Requested non-negative integer distance in twips.
 * @returns Whether the page model applied the change.
 */
export function setMountedHeaderFooterDistanceTwips(
  editor: QuireEditor,
  session: MountedHeaderFooterEditingSession,
  distanceTwips: number
): boolean {
  const owner = session.commandOwner;
  if (
    owner === undefined
    || resolveCommandOwnerNode(editor, session) === null
    || !Number.isInteger(distanceTwips)
    || distanceTwips < 0
  ) {
    return false;
  }

  return resolveQuireDocumentProfile(editor.extensionManager).pageModel
    .writeBandDistanceSetting(editor, owner.position, session.region, distanceTwips);
}

/**
 * Resolves and validates the structural node referenced by a mounted session.
 *
 * @param editor - Editor containing the latest document state.
 * @param session - Session whose command owner should be validated.
 * @returns Current structural node, or null when the transient reference is stale.
 */
function resolveCommandOwnerNode(
  editor: QuireEditor,
  session: MountedHeaderFooterEditingSession
): ProseMirrorNode | null {
  const owner = session.commandOwner;
  if (owner === undefined) {
    return null;
  }

  const node = editor.state.doc.nodeAt(owner.position);
  if (
    node?.type.name !== owner.nodeType
    || (owner.stableId !== undefined && node.attrs.id !== owner.stableId)
  ) {
    return null;
  }

  return node;
}
