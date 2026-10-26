import type { ResolvedPos } from "@quirekit/pm";
import type { QuireAccessibleContainerDescription, QuireAccessibleNodeDescription, QuireAccessibleTextDescription } from "../contract";
import type { AccessibilityRegistry } from "./types";

/** Maximum structural nesting admitted by the bounded reader and native text bridge. */
export const accessibilityDepthLimit = 32;

/** @param value - Owned semantic facts. @returns Whether facts describe a native textblock. */
export function isTextDescription(value: QuireAccessibleNodeDescription | null): value is QuireAccessibleTextDescription {
  return value?.kind === "paragraph" || value?.kind === "heading" || value?.kind === "code-block";
}

/** @param value - Owned semantic facts. @returns Whether facts describe a traversable container. */
export function isContainerDescription(value: QuireAccessibleNodeDescription | null): value is QuireAccessibleContainerDescription {
  return value?.kind === "blockquote" || value?.kind === "list" || value?.kind === "list-item" || value?.kind === "group";
}

/**
 * Verifies every owner between the main document and an ordinary text target.
 * @param position - Canonical resolved text position.
 * @param registry - Compiled semantic owners.
 * @returns Whether text entry is explicitly admitted through the entire path.
 */
export function supportsTextPosition(position: ResolvedPos, registry: AccessibilityRegistry): boolean {
  if (position.depth < 1 || position.depth > accessibilityDepthLimit || !position.parent.isTextblock) return false;
  for (let depth = 1; depth <= position.depth; depth++) {
    const node = position.node(depth);
    if (node.isAtom || node.type.spec.isolating) return false;
    const description = registry.node(node);
    if (depth === position.depth) {
      if (!isTextDescription(description) || !description.editable) return false;
    } else if (!isContainerDescription(description) || !description.textNavigation) return false;
  }
  return true;
}
