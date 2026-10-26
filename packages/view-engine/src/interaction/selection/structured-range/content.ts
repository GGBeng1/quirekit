import {
  Fragment,
  Slice,
  type Node as PMNode
} from "@quirekit/pm";
import type { QuireStructuredRangeSegment } from "./types";

/**
 * Builds one clipboard slice from exact source-ordered selected ranges.
 *
 * @param doc - Document owning the selected ranges.
 * @param segments - Exact text and semantic structure ranges.
 * @returns Maximally open slice containing no unselected gaps.
 */
export function createStructuredRangeContent(
  doc: PMNode,
  segments: readonly QuireStructuredRangeSegment[]
): Slice {
  let content = Fragment.empty;

  // Each source range is sliced independently so an unselected gap can never
  // leak into clipboard content merely because the logical gesture crossed it.
  for (const segment of segments) {
    content = content.append(
      doc.slice(segment.range.from, segment.range.to, true).content
    );
  }

  return Slice.maxOpen(content, true);
}
