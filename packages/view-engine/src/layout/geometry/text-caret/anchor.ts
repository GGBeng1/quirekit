import {
  findQuireTextCaretStopAtPosition
} from "@quirekit/layout/text";
import {
  findQuireLayoutNodePathForPosition,
  resolveQuireLayoutNodePathVisibleRect
} from "../node-path";
import {
  inferStructuralTextCaretAffinity,
  resolveQuireStructuralTextCaret
} from "../structural-text-caret";
import { resolveQuireTextCaretAnchorCandidate } from "./candidates";
import { buildQuireTextCaretAnchorRect } from "./rect";
import type {
  QuireTextCaretAnchor,
  QuireTextCaretAnchorForPathOptions,
  QuireTextCaretAnchorOptions
} from "./types";

/** Default width for caret rectangles resolved by layout geometry. */
const defaultTextCaretAnchorWidth = 1;

/**
 * Resolves the visible caret anchor for a document position from the layout tree.
 *
 * @param options - Layout tree, document position, side preference, and caret width.
 * @returns Visible caret anchor, or null when the position cannot be mapped to text.
 */
export function resolveQuireTextCaretAnchor(
  options: QuireTextCaretAnchorOptions
): QuireTextCaretAnchor | null {
  const nodePath = findQuireLayoutNodePathForPosition(
    options.nodes,
    options.position
  );

  return resolveQuireTextCaretAnchorForPath({
    ...options,
    nodePath
  });
}

/**
 * Resolves a visible caret anchor from one exact layout occurrence path.
 *
 * @param options - Layout tree, exact path, position, side, and caret width.
 * @returns Visible caret anchor, or null when the path cannot map to text.
 */
export function resolveQuireTextCaretAnchorForPath(
  options: QuireTextCaretAnchorForPathOptions
): QuireTextCaretAnchor | null {
  const nodePath = options.nodePath;
  const node = nodePath.at(-1);

  if (!node) {
    return null;
  }

  const visibleRect = resolveQuireLayoutNodePathVisibleRect(nodePath) ?? node.rect;
  const candidate = resolveQuireTextCaretAnchorCandidate({
    fragments: node.textFragments ?? [],
    ownerRange: node.range,
    position: options.position,
    side: options.side ?? 1,
    visibleRect
  });

  if (candidate) {
    // A source gap uses the fragment's logical endpoint before consulting its
    // visually ordered stops; the returned anchor still keeps the request's PM
    // position. This also preserves the endpoint of a reversed visual run.
    const fragmentPosition = Math.max(candidate.fragment.range.from,
      Math.min(options.position, candidate.fragment.range.to));
    const caretStop = findQuireTextCaretStopAtPosition(
      candidate.fragment,
      fragmentPosition
    );

    return {
      position: { pos: options.position, bias: 0 },
      rect: buildQuireTextCaretAnchorRect(
        candidate.fragment,
        caretStop,
        candidate.visibleRect,
        options.caretWidth ?? defaultTextCaretAnchorWidth
      ),
      source: "text"
    };
  }

  const structuralTextCaret = resolveQuireStructuralTextCaret({
    nodes: options.nodes,
    node,
    position: options.position,
    clipRect: visibleRect,
    affinity:
      (options.side ?? 1) < 0
        ? "trailing"
        : inferStructuralTextCaretAffinity(node, options.position)
  });

  return structuralTextCaret === null
    ? null
    : {
        position: structuralTextCaret.position,
        rect: {
          ...structuralTextCaret.rect,
          width: options.caretWidth ?? defaultTextCaretAnchorWidth
        },
        source: "structural"
      };
}
