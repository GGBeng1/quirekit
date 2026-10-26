import type { QuireDocumentPosition } from "@quirekit/renderer";
import type { QuirePoint } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../../layout";
import type {
  QuireLayoutCapabilitySet,
  QuireLayoutRegionRef,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import { isQuireEmptyTextblockLayoutNode, isQuirePointerTransparentLayoutNode } from "../../layout-node-role";
import { mapQuireEditableTextNodePointToCaret } from "../../text";
import type { QuireLayoutQueryProductOwner } from "@quirekit/layout/products";
import { createQuireLayoutNodeQueryProductOwner } from "../../layout-node-owner";

/**
 * Maps a point inside a layout node to the nearest document position.
 *
 * @param node - Layout node containing the point.
 * @param point - Canvas point being mapped.
 * @returns Document position and paint rect for the point.
 */
export function mapPointToLayoutNodePosition(
  node: QuireLayoutNode,
  point: QuirePoint
): {
  readonly position: QuireDocumentPosition;
  readonly inside: number;
  readonly rect: QuireLayoutNode["rect"];
  readonly viewRegion?: QuireLayoutRegionRef | undefined;
  readonly ownerSource?: QuireLayoutSourceRef | undefined;
  readonly ownerCapabilities?: QuireLayoutCapabilitySet | undefined;
  readonly queryOwner?: QuireLayoutQueryProductOwner | undefined;
} {
  const editableTextMapping = mapQuireEditableTextNodePointToCaret({
    node,
    point
  });
  const ownerFacts = {
    ...(node.layoutOwner === undefined
      ? {}
      : {
          viewRegion: node.layoutOwner.region,
          ownerSource: node.layoutOwner.source,
          ownerCapabilities: node.layoutOwner.capabilities
        })
  };
  const queryOwner = createQuireLayoutNodeQueryProductOwner(node);
  const queryFacts = queryOwner === undefined ? {} : { queryOwner };

  if (editableTextMapping) {
    return { ...editableTextMapping, ...ownerFacts, ...queryFacts };
  }

  if (isQuireEmptyTextblockLayoutNode(node)) {
    return {
      position: { pos: node.range.from + 1, bias: 0 },
      inside: node.range.from,
      rect: node.rect,
      ...ownerFacts,
      ...queryFacts
    };
  }

  const midpoint = node.rect.x + node.rect.width / 2;

  if (point.x <= midpoint) {
    return {
      position: { pos: node.range.from, bias: 1 },
      inside: node.range.from,
      rect: node.rect,
      ...ownerFacts,
      ...queryFacts
    };
  }

  return {
    position: { pos: node.range.to, bias: -1 },
    inside: node.range.from,
    rect: node.rect,
    ...ownerFacts,
    ...queryFacts
  };
}

/**
 * Checks whether a layout node owns editable text placement for a pointer hit.
 *
 * @param node - Layout node found at the pointer, or null when none matched.
 * @returns Whether the node should be mapped before structural fallbacks.
 */
export function isTextContentLayoutNode(
  node: QuireLayoutNode | null
): node is QuireLayoutNode {
  return (
    node !== null &&
    !isQuirePointerTransparentLayoutNode(node) &&
    ((node.textFragments?.length ?? 0) > 0 || isQuireEmptyTextblockLayoutNode(node))
  );
}
