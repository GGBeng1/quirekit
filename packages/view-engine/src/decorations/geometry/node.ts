import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";

/** Table-carrier geometry supported by renderer-neutral node decorations. */
export type QuireDecorationTableGeometryKind = "table-row" | "table-cell";

/** Minimal layout geometry consumed by the node-decoration lane. */
export interface QuireDecorationNodeGeometry {
  /** Stable visual identity within one snapshot. */
  readonly id: string;
  /** Document range represented by the visual. */
  readonly range: QuireDocumentRange;
  /** Rectangle painted by the decoration. */
  readonly rect: QuireRect;
}

/**
 * Finds the layout node that represents a node decoration range.
 *
 * Snapshots may lay out only part of the document. A decorated node outside the
 * laid-out part has no visual; an enclosing ancestor would outline unrelated content.
 *
 * @param snapshot - Layout snapshot to inspect.
 * @param range - Decoration document range.
 * @returns Start-aligned layout node, or null when the node is not laid out.
 */
export function findQuireDecorationNode(
  snapshot: QuireLayoutSnapshot,
  range: QuireDocumentRange
): QuireLayoutNode | null {
  return findDeepestStartAlignedContainingNode(snapshot.root, range);
}

/**
 * Finds every retained Table carrier fragment represented by a node decoration.
 *
 * Native row/cell nodes are structural schema carriers, while the shared layout
 * tree retains physical row/cell rectangles inside the Table snapshot. This
 * adapter joins those existing facts without inventing a second Table model or
 * exposing Word semantics to the renderer.
 *
 * @param snapshot - Layout snapshot to inspect.
 * @param range - Full source node range carried by the decoration.
 * @param kind - Requested row or cell geometry.
 * @returns Matching physical fragments in stable traversal order.
 */
export function findQuireDecorationTableGeometries(
  snapshot: QuireLayoutSnapshot,
  range: QuireDocumentRange,
  kind: QuireDecorationTableGeometryKind
): readonly QuireDecorationNodeGeometry[] {
  const geometries: QuireDecorationNodeGeometry[] = [];
  const seen = new Set<string>();

  visitLayoutNodes(snapshot.root, (node) => {
    const table = node.table;
    if (table === undefined) return;
    const candidates = kind === "table-cell" ? table.cells : table.rows;
    for (const candidate of candidates) {
      if (!matchesTableCarrierRange(table.tableRange, candidate, range, kind)) {
        continue;
      }
      const key = [
        candidate.id,
        candidate.rect.x,
        candidate.rect.y,
        candidate.rect.width,
        candidate.rect.height
      ].join(":");
      if (seen.has(key)) continue;
      seen.add(key);
      geometries.push({
        id: `${node.id}:${candidate.id}`,
        range: candidate.range,
        rect: candidate.rect
      });
    }
  });

  return geometries;
}

/**
 * Tests one retained Table candidate against the decorated native carrier.
 *
 * @param tableRange - Source range of the owning Table.
 * @param candidate - Retained row or cell fragment.
 * @param range - Full decorated node range.
 * @param kind - Requested carrier kind.
 * @returns Whether the candidate represents the decorated carrier.
 */
function matchesTableCarrierRange(
  tableRange: QuireDocumentRange,
  candidate: NonNullable<QuireLayoutNode["table"]>["rows"][number]
    | NonNullable<QuireLayoutNode["table"]>["cells"][number],
  range: QuireDocumentRange,
  kind: QuireDecorationTableGeometryKind
): boolean {
  if (kind === "table-cell" && "originCellPos" in candidate) {
    return tableRange.from + candidate.originCellPos === range.from;
  }
  if (kind === "table-row" && "rowIndex" in candidate) {
    return candidate.range.from === range.from + 1
      && candidate.range.to <= range.to - 3;
  }
  return false;
}

/**
 * Visits every layout node in pre-order.
 *
 * @param node - Current layout node.
 * @param visitor - Callback receiving each retained node.
 */
function visitLayoutNodes(
  node: QuireLayoutNode,
  visitor: (node: QuireLayoutNode) => void
): void {
  visitor(node);
  for (const child of node.children ?? []) visitLayoutNodes(child, visitor);
}

/**
 * Finds the deepest containing node whose start aligns with the decoration.
 *
 * @param node - Layout node to inspect recursively.
 * @param range - Decoration document range.
 * @returns Matching layout node or null.
 */
function findDeepestStartAlignedContainingNode(
  node: QuireLayoutNode,
  range: QuireDocumentRange
): QuireLayoutNode | null {
  if (!containsRange(node.range, range)) {
    return null;
  }

  for (const child of node.children ?? []) {
    const match = findDeepestStartAlignedContainingNode(child, range);

    if (match) {
      return match;
    }
  }

  return node.range.from === range.from ? node : null;
}

/**
 * Checks whether a layout range fully contains a decoration range.
 *
 * @param candidate - Candidate container range.
 * @param range - Range to test.
 * @returns Whether the candidate contains the range.
 */
function containsRange(
  candidate: QuireDocumentRange,
  range: QuireDocumentRange
): boolean {
  return candidate.from <= range.from && candidate.to >= range.to;
}
