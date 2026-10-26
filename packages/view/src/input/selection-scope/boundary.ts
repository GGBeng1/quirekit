import type { QuireCommandRoutingScope, QuirePageModelProfile } from "@quirekit/view-engine";
import { Selection, type Node as ProseMirrorNode } from "@quirekit/pm";
import { resolveQuireStoryCommandBoundary } from "../story-boundary";
import type { QuireSelectionScopeBoundary } from "./types";

/**
 * Resolves the active body or auxiliary-story boundary for mounted selection.
 *
 * @param scope - Active retained command scope.
 * @param doc - Current ProseMirror document.
 * @param pageModel - Page model separating body flow from auxiliary story storage.
 * @returns Live selectable source boundary, or null without exact ownership.
 */
export function resolveQuireSelectionScopeBoundary(
  scope: QuireCommandRoutingScope,
  doc: ProseMirrorNode,
  pageModel: Pick<QuirePageModelProfile, "isBodyFlowBlock">
): QuireSelectionScopeBoundary | null {
  const storyBoundary = resolveQuireStoryCommandBoundary(scope, doc);
  if (storyBoundary !== null) {
    return storyBoundary;
  }

  const range = resolveLiveQuireBodyStructuralRange(doc, pageModel);
  if (range.from >= range.to) {
    return null;
  }

  const headPosition = scope.selection.$head.pos;
  const isCanonicalBodyOwner = scope.activeRegion?.kind === "body"
    && scope.activeRegion.rootId.value === "root:body"
    && scope.activeSource?.sourceId === "doc:body";
  const isNestedBodyOwner = scope.activeRegion !== undefined
    && headPosition >= range.from
    && headPosition <= range.to;
  if (!isCanonicalBodyOwner && !isNestedBodyOwner) {
    return null;
  }

  const startSelection = Selection.near(doc.resolve(range.from), 1);
  const endSelection = Selection.near(doc.resolve(range.to), -1);
  const selectionFrom = Math.max(range.from, startSelection.from);
  const selectionTo = Math.min(range.to, endSelection.to);

  return selectionFrom > selectionTo
      ? null
      : {
        sourceId: "doc:body",
        regionKind: "body",
        from: range.from,
        to: range.to,
        selectionFrom,
        selectionTo
      };
}

/**
 * Resolves the current top-level body range independently of stale layout size.
 *
 * Auxiliary story storage remains a normal top-level ProseMirror node for
 * history and collaboration but does not participate in mounted body flow.
 * Recomputing from current nodes keeps Select All correct immediately after an
 * edit, before a newer layout snapshot has replaced retained source ranges.
 *
 * @param doc - Current ProseMirror document.
 * @param pageModel - Page model identifying body-flow blocks.
 * @returns Structural range spanning current body-flow blocks.
 */
function resolveLiveQuireBodyStructuralRange(
  doc: ProseMirrorNode,
  pageModel: Pick<QuirePageModelProfile, "isBodyFlowBlock">
): { readonly from: number; readonly to: number } {
  let from: number | null = null;
  let to = 0;
  let reachedStoryStore = false;

  doc.forEach((child, offset) => {
    if (!pageModel.isBodyFlowBlock(child)) {
      reachedStoryStore = true;
      return;
    }

    if (!child.isBlock || reachedStoryStore) {
      return;
    }

    from ??= offset;
    to = offset + child.nodeSize;
  });

  return { from: from ?? 0, to };
}
