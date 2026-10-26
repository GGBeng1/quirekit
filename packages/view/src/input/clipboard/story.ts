import {
  canvasInternalClipboardMime,
  serializeQuireClipboardSlice,
  type QuireClipboardData
} from "@quirekit/clipboard";
import type { QuireEditor } from "@quirekit/core";
import { Slice, type Node as ProseMirrorNode } from "@quirekit/pm";
import type { QuireStoryCommandBoundary } from "../story-boundary";

/** Inputs used to serialize a selection from one active auxiliary story. */
export interface WriteQuireStoryClipboardSelectionOptions {
  /** Editor whose current selection is copied. */
  readonly editor: QuireEditor;
  /** Active structural and selectable story bounds. */
  readonly boundary: QuireStoryCommandBoundary;
  /** Clipboard adapter receiving standard MIME products. */
  readonly clipboardData: QuireClipboardData;
}

/**
 * Writes story-internal clipboard data without persisted wrapper nodes.
 *
 * @param options - Editor selection, story boundary, and clipboard adapter.
 * @returns Whether a non-empty story selection was serialized.
 */
export function writeQuireStoryClipboardSelection(
  options: WriteQuireStoryClipboardSelectionOptions
): boolean {
  const { selection, doc } = options.editor.state.pm;

  if (selection.empty) {
    return false;
  }

  const storyNode = findQuireStoryBoundaryNode(doc, options.boundary);

  if (storyNode === null) {
    return false;
  }

  const from = Math.max(selection.from, options.boundary.selectionFrom);
  const to = Math.min(selection.to, options.boundary.selectionTo);

  if (from >= to) {
    return false;
  }

  // Clipboard payloads represent selected story content, not the persisted
  // wordStory/wordStoryStore path that makes the single-document model work.
  const content = storyNode.content.cut(
    from - options.boundary.from,
    to - options.boundary.from
  );
  const serialized = serializeQuireClipboardSlice({
    editor: options.editor,
    slice: Slice.maxOpen(content)
  });
  const plainText = doc.textBetween(from, to, "\n", "\uFFFC");

  options.clipboardData.setData(
    canvasInternalClipboardMime,
    serialized.internal
  );
  options.clipboardData.setData("text/html", serialized.html);
  options.clipboardData.setData("text/plain", plainText);
  return true;
}

/**
 * Finds the live story container whose content starts at the boundary.
 *
 * @param doc - Current ProseMirror document.
 * @param boundary - Active story boundary.
 * @returns Live story container node, or null when retained facts are stale.
 */
function findQuireStoryBoundaryNode(
  doc: ProseMirrorNode,
  boundary: QuireStoryCommandBoundary
): ProseMirrorNode | null {
  const $position = doc.resolve(boundary.selectionFrom);

  for (let depth = $position.depth; depth > 0; depth -= 1) {
    if ($position.start(depth) === boundary.from) {
      return $position.node(depth);
    }
  }

  return null;
}
