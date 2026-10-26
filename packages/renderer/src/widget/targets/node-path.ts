/**
 * Gets path depth for hit-test ordering and direct-child queries.
 *
 * @param nodePath - Dot-separated compiler node path.
 * @returns Number of path segments.
 */
export function getNodePathDepth(nodePath: string): number {
  return nodePath.split(".").filter(Boolean).length;
}

/**
 * Lists node-path ancestors from deepest to outermost.
 *
 * @param nodePath - Dot-separated compiler node path.
 * @returns Node path ancestors.
 */
export function resolveNodePathAncestors(nodePath: string): readonly string[] {
  const parts = nodePath.split(".").filter(Boolean);
  const ancestors: string[] = [];

  for (let index = parts.length; index > 0; index -= 1) {
    ancestors.push(parts.slice(0, index).join("."));
  }

  return ancestors;
}
