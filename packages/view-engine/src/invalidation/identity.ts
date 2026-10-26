import type { Node as ProseMirrorNode } from "@quirekit/pm";

/**
 * Creates the canonical document-node identity shared by invalidation and layout.
 *
 * @param node - ProseMirror node represented by the retained product.
 * @param path - Index path from the document root to the node.
 * @returns Stable identity within one document structure version.
 */
export function createQuireDocumentNodeId(
  node: ProseMirrorNode,
  path: readonly number[]
): string {
  return path.length === 1
    ? `${node.type.name}-${path[0]}`
    : `${node.type.name}-${path.join("-")}`;
}
