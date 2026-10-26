import type { QuireLayoutNode, QuireSubLayoutQueryProducts } from "../../layout";

/**
 * Iterates retained query products in a stable depth-first layout order.
 *
 * @param nodes - Ordered layout roots whose retained products are inspected.
 * @param childrenFirst - Whether nested products precede their owning node.
 * @returns Query-product iterator preserving sibling order in either mode.
 */
export function* iterateQuireSubLayoutQueryProductSets(
  nodes: readonly QuireLayoutNode[],
  childrenFirst = false
): Generator<QuireSubLayoutQueryProducts> {
  for (const node of nodes) {
    const products = node.subLayoutQueryProducts;
    if (!childrenFirst && products !== undefined) {
      yield products;
    }

    // Product-less containers still own nested query surfaces; traversal order
    // controls candidate priority without changing the accepted product objects.
    yield* iterateQuireSubLayoutQueryProductSets(node.children ?? [], childrenFirst);

    if (childrenFirst && products !== undefined) {
      yield products;
    }
  }
}
