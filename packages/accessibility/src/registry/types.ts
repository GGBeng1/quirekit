import type { Mark, Node } from "@quirekit/pm";
import type { QuireAccessibleMarkDescription, QuireAccessibleNodeDescription } from "../contract";

/** Editor-local compiled capabilities; immutable source nodes key the description cache. */
export interface AccessibilityRegistry {
  /** @param node - Canonical node. @returns Owned semantics, or null when unhandled. */
  node(node: Node): QuireAccessibleNodeDescription | null;
  /** @param mark - Canonical mark. @returns Owned inline semantics, or null for plain text. */
  mark(mark: Mark): QuireAccessibleMarkDescription | null;
}
