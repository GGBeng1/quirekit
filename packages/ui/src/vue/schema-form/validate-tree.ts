import { normalizeFormFieldPath } from "../form-field/path";
import type { QuireKitSchemaNode } from "./types";

/** Rejects ambiguous ownership before any configured fields are registered.
 * @param nodes - Complete trusted tree, including currently hidden fields.
 */
export function validateSchemaTree(nodes: readonly QuireKitSchemaNode[]): void {
  const names = new Set<string>();
  /** Checks one sibling set and recurses into semantic groups.
   * @param siblings - Nodes that share a render-key namespace.
   */
  function visit(siblings: readonly QuireKitSchemaNode[]): void {
    const keys = new Set<string>();
    for (const node of siblings) {
      const key = "children" in node ? node.key : node.key ?? node.name;
      if (!key || keys.has(key)) throw new Error(`Duplicate or empty QuireSchemaForm sibling key "${key}".`);
      keys.add(key);
      if ("children" in node) visit(node.children);
      else {
        const name = normalizeFormFieldPath(node.name);
        if (!name || names.has(name)) throw new Error(`Duplicate or empty QuireSchemaForm field name "${node.name}".`);
        names.add(name);
      }
    }
  }
  visit(nodes);
}
