import type { Node as PMNode } from "@quirekit/pm";

/** Options used when checking whether a ProseMirror node is empty. */
export interface QuireIsNodeEmptyOptions {
  /** Whether child nodes should be checked recursively. */
  readonly checkChildren?: boolean | undefined;
  /** Whether whitespace-only text should count as empty. */
  readonly ignoreWhitespace?: boolean | undefined;
}

/**
 * Reports whether a ProseMirror node has no meaningful content.
 *
 * @param node - Node to inspect.
 * @param options - Emptiness check options.
 * @returns Whether the node is empty.
 */
export function isNodeEmpty(
  node: PMNode,
  options: QuireIsNodeEmptyOptions = {}
): boolean {
  const { checkChildren = true, ignoreWhitespace = false } = options;

  if (ignoreWhitespace) {
    if (node.type.name === "hardBreak") {
      return true;
    }

    if (node.isText) {
      return /^\s*$/m.test(node.text ?? "");
    }
  }

  if (node.isText) {
    return !node.text;
  }

  if (node.isAtom || node.isLeaf) {
    return false;
  }

  if (node.content.childCount === 0) {
    return true;
  }

  if (!checkChildren) {
    return false;
  }

  let isContentEmpty = true;

  node.content.forEach((childNode) => {
    if (!isContentEmpty) {
      return;
    }

    if (!isNodeEmpty(childNode, { checkChildren, ignoreWhitespace })) {
      isContentEmpty = false;
    }
  });

  return isContentEmpty;
}
