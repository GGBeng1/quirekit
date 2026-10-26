import type { EditorUINodeIdentity, EditorUINodeOrderFact } from "./types";

/**
 * Creates the stable comparison key for one node identity.
 *
 * @param identity - Stable identity to encode.
 * @returns Root-scoped stable comparison key.
 */
export function createEditorUINodeIdentityKey(
  identity: EditorUINodeIdentity
): string {
  return `${identity.rootId}\u0000${identity.nodeId}`;
}

/**
 * Compares two stable node identities without consulting occurrence positions.
 *
 * @param left - First identity.
 * @param right - Second identity.
 * @returns Whether root and node identities match.
 */
export function editorUINodeIdentitiesEqual(
  left: EditorUINodeIdentity,
  right: EditorUINodeIdentity
): boolean {
  return left.rootId === right.rootId && left.nodeId === right.nodeId;
}

/**
 * Validates one stable identity.
 *
 * @param identity - Identity candidate to validate.
 * @returns Whether both opaque identity components are non-empty.
 */
export function isValidEditorUINodeIdentity(
  identity: EditorUINodeIdentity
): boolean {
  return identity.rootId.length > 0 && identity.nodeId.length > 0;
}

/**
 * Validates one snapshot-local node occurrence.
 *
 * @param fact - Node occurrence to validate.
 * @returns Whether identity, order, and document range are valid.
 */
export function isValidEditorUINodeOrderFact(
  fact: EditorUINodeOrderFact
): boolean {
  return isValidEditorUINodeIdentity(fact.identity)
    && Number.isSafeInteger(fact.order)
    && fact.order >= 0
    && Number.isSafeInteger(fact.range.from)
    && Number.isSafeInteger(fact.range.to)
    && fact.range.from >= 0
    && fact.range.to >= fact.range.from;
}
