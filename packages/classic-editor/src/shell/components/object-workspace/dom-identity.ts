let nextObjectWorkspaceDomId = 0;

/**
 * Creates a document-safe identity across independently mounted Vue roots.
 *
 * @param family - Short semantic DOM identity family.
 * @returns Process-local unique DOM id prefix.
 */
export function createObjectWorkspaceDomId(family: string): string {
  nextObjectWorkspaceDomId += 1;
  return `qk-object-${family}-${nextObjectWorkspaceDomId}`;
}
