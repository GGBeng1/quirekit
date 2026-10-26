import type { ContentMatch, NodeType } from "@quirekit/pm";

/**
 * Gets the first default textblock type accepted by a content match.
 *
 * @param match - Content match to inspect.
 * @returns Default textblock node type, or null.
 */
export function defaultBlockAt(match: ContentMatch): NodeType | null {
  for (let index = 0; index < match.edgeCount; index += 1) {
    const { type } = match.edge(index);

    if (type.isTextblock && !type.hasRequiredAttrs()) {
      return type;
    }
  }

  return null;
}
