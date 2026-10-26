import type { QuireLayoutNode } from "../../../layout";
import { resolveQuireLayoutNodePathForSelectionContext } from "../../selection/layout-node-context";
import { createQuireTableChromeFragment } from "./anchors";
import type {
  BuildQuireTableChromeModelOptions,
  QuireTableChromeModel
} from "./types";

/**
 * Derives page-fragment-aware Table chrome from retained layout authority.
 *
 * @param options - Layout roots, semantic table position, and active occurrence context.
 * @returns Headless Table chrome, or null when retained geometry has no target table.
 */
export function buildQuireTableChromeModel(
  options: BuildQuireTableChromeModelOptions
): QuireTableChromeModel | null {
  const tableNodes = collectTableNodes(options.nodes, options.tablePos);
  if (tableNodes.length === 0) {
    return null;
  }

  // Resolve active visual ownership before compiling affordances so repeated
  // headers and continuation fragments never fall back to product-side guesses.
  const activePath = resolveQuireLayoutNodePathForSelectionContext(
    options.nodes,
    options.activePosition,
    options.selectionContext
  );
  const activeTable = [...activePath].reverse().find((node) =>
    node.table?.tableRange.from === options.tablePos
  )?.table;
  const fragments = tableNodes.map((node) =>
    createQuireTableChromeFragment(node.table!)
  );

  return {
    sizing: tableNodes[0]?.table?.sizing,
    tableId: tableNodes[0]?.table?.tableId ?? "",
    tablePos: options.tablePos,
    activeFragmentId: activeTable?.fragmentId
      ?? fragments[0]?.fragmentId
      ?? "",
    fragments,
    selection: options.selection ?? null,
    resizeSession: options.resizeSession ?? null
  };
}

/**
 * Collects every page-local occurrence of one semantic table.
 *
 * @param nodes - Current retained layout roots.
 * @param tablePos - Absolute position immediately before the target table.
 * @returns Table-owning layout nodes in stable visual order.
 */
function collectTableNodes(
  nodes: readonly QuireLayoutNode[],
  tablePos: number
): readonly QuireLayoutNode[] {
  return nodes.flatMap((node): readonly QuireLayoutNode[] => [
    ...(node.table?.tableRange.from === tablePos ? [node] : []),
    ...collectTableNodes(node.children ?? [], tablePos)
  ]);
}
