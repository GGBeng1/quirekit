import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type { QuireLayoutNode } from "../layout/types";

/** Inputs used to resolve pointer ownership for one adapted layout subtree. */
export interface ResolveQuireLayoutInteractionRoleOptions {
  /** Explicit role inherited from projection helper geometry. */
  readonly inheritedRole?: QuireLayoutNode["interactionRole"] | undefined;
  /** Exact retained owner projected onto the current layout box. */
  readonly owner?: QuireLayoutOwnerFacts | undefined;
  /** Current editor selection, when the snapshot carries one. */
  readonly selection?: QuireDocumentRange | undefined;
}

/**
 * Resolves whether one layout subtree may participate in pointer hit testing.
 *
 * Drawing text is painted in every state, but it becomes editable geometry only
 * after the mounted drawing runtime has moved the editor selection into its
 * independent story. Until then the enclosing drawing surface owns clicks, as
 * Word processors do for inactive and object-selected text boxes.
 *
 * @param options - Inherited role, exact owner, and current editor selection.
 * @returns Paint-only for inactive drawing text, otherwise the inherited role.
 */
export function resolveQuireLayoutInteractionRole(
  options: ResolveQuireLayoutInteractionRoleOptions
): QuireLayoutNode["interactionRole"] | undefined {
  if (options.inheritedRole === "source-geometry") {
    return options.inheritedRole;
  }
  if (options.owner?.region.kind !== "drawing-text") {
    return options.inheritedRole;
  }

  const range = options.owner.source.range;
  const selection = options.selection;
  return range !== undefined
    && selection !== undefined
    && selection.from >= range.from
    && selection.to <= range.to
    ? options.inheritedRole
    : "paint-only";
}
