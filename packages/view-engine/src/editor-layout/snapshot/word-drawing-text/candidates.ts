import { createQuireSubtreePredicate, visitQuireMatchingDescendants, type QuireEditorState } from "@quirekit/core";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import { resolveQuireWordShapeTextInsets } from "../../../drawing/geometry";
import type { QuireDrawingModelProfile } from "../../../document-profile/types";
import type { QuireWordDrawingTextCandidate } from "./types";

/**
 * Collects valid horizontal text-box references in document order.
 *
 * @param state - Editor state containing live anchor attrs.
 * @param drawingModel - Drawing model reading anchor attrs.
 * @returns Unique drawing text candidates keyed by object identity.
 */
export function collectDrawingTextCandidates(
  state: QuireEditorState,
  drawingModel: QuireDrawingModelProfile
): readonly QuireWordDrawingTextCandidate[] {
  const anchorNodeType = drawingModel.anchorNodeType;
  if (anchorNodeType === null) return [];
  // Every section pass of one document reads the same candidates.
  let byModel = candidatesByDocument.get(state.doc);
  const known = byModel?.get(drawingModel);
  if (known !== undefined) return known;
  const candidates: QuireWordDrawingTextCandidate[] = [];
  const objectIds = new Set<string>();

  visitQuireMatchingDescendants(state.doc, readAnchorPredicate(anchorNodeType), (node) => {
    if (node.type.name !== anchorNodeType) {
      return true;
    }
    const attrs = drawingModel.readObject(node.attrs);
    const textBody = attrs?.drawing.textBody;
    if (
      attrs === undefined
      || attrs.storyId === null
      || textBody == null
      || objectIds.has(attrs.objectId)
    ) {
      return false;
    }

    const textInsets = resolveQuireWordShapeTextInsets(attrs.drawing);
    objectIds.add(attrs.objectId);
    candidates.push({
      objectId: attrs.objectId,
      drawingId: attrs.drawing.drawingId,
      storyId: attrs.storyId,
      insets: textInsets,
      rotation: attrs.drawing.transform.rotation,
      fitFrame: textBody.autofit === "fit-frame",
      opacity: textBody.opacity ?? 1,
      flipHorizontal: attrs.drawing.transform.flipHorizontal,
      flipVertical: attrs.drawing.transform.flipVertical,
      width: Math.max(1, attrs.drawing.extent.width
        - textInsets.left
        - textInsets.right),
      height: Math.max(1, attrs.drawing.extent.height
        - textInsets.top
        - textInsets.bottom)
    });
    return false;
  });

  if (byModel === undefined) {
    byModel = new WeakMap();
    candidatesByDocument.set(state.doc, byModel);
  }
  byModel.set(drawingModel, candidates);
  return candidates;
}

/** Candidates per immutable document and drawing model. */
const candidatesByDocument = new WeakMap<object, WeakMap<QuireDrawingModelProfile, readonly QuireWordDrawingTextCandidate[]>>();

/** Subtree tests per drawing anchor node type. */
const anchorPredicates = new Map<string, (node: ProseMirrorNode) => boolean>();

/**
 * @param anchorNodeType - Node type the drawing model reads anchors from.
 * @returns Whether a subtree holds such an anchor.
 */
function readAnchorPredicate(anchorNodeType: string): (node: ProseMirrorNode) => boolean {
  let predicate = anchorPredicates.get(anchorNodeType);
  if (predicate === undefined) {
    predicate = createQuireSubtreePredicate((node) => node.type.name === anchorNodeType);
    anchorPredicates.set(anchorNodeType, predicate);
  }
  return predicate;
}
