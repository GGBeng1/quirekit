/**
 * Resolves where an accepted target lands after deleting the source node.
 *
 * @param sourcePosition - Accepted position before the moved node.
 * @param nodeSize - ProseMirror size of the moved node.
 * @param targetPosition - Accepted pre-transaction target position.
 * @returns Insertion position in the document after source deletion.
 */
export function resolveSpeculativeRelocationInsertionPosition(
  sourcePosition: number,
  nodeSize: number,
  targetPosition: number
): number {
  if (targetPosition <= sourcePosition) {
    return targetPosition;
  }
  return targetPosition >= sourcePosition + nodeSize
    ? targetPosition - nodeSize
    : sourcePosition;
}

/**
 * Maps a caret from a speculative single-node relocation back to accepted doc coordinates.
 *
 * @param position - Position in the speculative relocated document.
 * @param sourcePosition - Accepted position before the moved node.
 * @param nodeSize - ProseMirror size of the moved node.
 * @param targetPosition - Accepted pre-transaction target used by the preview.
 * @returns Equivalent position in the accepted document.
 */
export function mapSpeculativeRelocationPositionToAccepted(
  position: number,
  sourcePosition: number,
  nodeSize: number,
  targetPosition: number
): number {
  const insertionPosition = resolveSpeculativeRelocationInsertionPosition(
    sourcePosition,
    nodeSize,
    targetPosition
  );
  if (
    position >= insertionPosition
    && position <= insertionPosition + nodeSize
  ) {
    return targetPosition;
  }

  // Invert insertion first, then restore the deleted source range. This is the
  // reverse order of the transient relocation transaction.
  const positionAfterDeletion = position > insertionPosition + nodeSize
    ? position - nodeSize
    : position;
  return positionAfterDeletion >= sourcePosition
    ? positionAfterDeletion + nodeSize
    : positionAfterDeletion;
}
